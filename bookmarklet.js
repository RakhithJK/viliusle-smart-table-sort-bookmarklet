javascript:(function(){
	/* Smart table sort bookmarklet + conditional formatting */
	/* Author: Vilius L.
	/* URL: https://github.com/viliusle/smart-table-sort-bookmarklet */
	/* Based on https://github.com/HubSpot/sortable */

	/* settings */
	var CONDITIONAL_FORMATTING = true;
	var CONDITIONAL_FORMATTING_QUERY = 'table';
	var TABLES_QUERY = 'table';

	var addEventListener;
	var sortable;
	var numberRegExp = /^-?[£$¤]?[\d,.]+%?$/;
	var trimRegExp = /^\s+|\s+$/g;
	var clickEvents = ['click'];

	addEventListener = function(el, event, handler) {
		if (el.addEventListener != null) {
			return el.addEventListener(event, handler, false);
		} else {
			return el.attachEvent("on" + event, handler);
		}
	};

	sortable = {
		prepare: function(){
			/*inject CSS*/
			var CSS = `
				/*required styles for sorting*/
				table.sortable th{
					cursor: pointer;
				}
				table.sortable th[data-sorted-direction="ascending"], 
				table.sortable th[data-sorted-direction="descending"]{
					position:relative;
					padding-right: 20px !important;
				}
				table.sortable th[data-sorted-direction="ascending"]:after, 
				table.sortable th[data-sorted-direction="descending"]:after{
					position: absolute;
					content: '';
					width: 0;
					height: 0;
					border-left: 6px solid transparent;
					border-right: 6px solid transparent;
					top: calc(50% - 4px);
					right: 4px;
				}
				table.sortable th[data-sorted-direction="ascending"]:after {
					border-bottom: 8px solid #555;
				}
				table.sortable th[data-sorted-direction="descending"]:after{
					border-top: 8px solid #555;
				}
				/* additional styles - Zebra rows */
				table.sortable td {
					background-color: white;
				}
				table.sortable tr:nth-child(2n) td {
					background-color: #f3f7fa;
				}
			`;
			const style = document.createElement('style');
			style.textContent = CSS;
			document.head.append(style);

			var tables = document.querySelectorAll(TABLES_QUERY);
			for(var k = 0; k < tables.length; k++) {
				var table = tables[k];

				/* fix "thead td" to "thead th" */
				var targets = table.querySelectorAll('thead td');
				if(targets.length > 0){
					targets[0].parentNode.innerHTML = targets[0].parentNode.innerHTML
						.replace(/<td/gi, '<th')
						.replace(/<\/td>/gi, '</th>');
				}

				/* drop thead with rowspan */
				var targets = table.querySelectorAll('thead tr');
				for(var i = 0; i < targets.length; i++) {
					var table_errors = targets[i].querySelectorAll('th[colspan]');
					if(table_errors.length > 0){
						targets[i].parentNode.removeChild(targets[i]);
					}
				}

				/* drop invisible thead rows */
				var targets = table.querySelectorAll('thead tr');
				for(var i = 0; i < targets.length; i++) {
					if(targets[i].offsetParent === null){
						targets[i].parentNode.removeChild(targets[i]);
					}
				}

				/* drop rows that are "Totals"  */
				var targets = table.querySelectorAll('tr');
				for(var i = 0; i < targets.length; i++) {
					if(targets[i].className.toLowerCase().indexOf("total") > -1){
						targets[i].parentNode.removeChild(targets[i]);
					}
				}

				/* merge multiple tbodies */
				var targets = table.querySelectorAll('tbody');
				if(targets.length > 1){
					for(var i = 1; i < targets.length; i++) {
						targets[0].innerHTML = targets[0].innerHTML + "\n" + targets[i].innerHTML;
						targets[i].parentNode.removeChild(targets[i]);
					}
				}

				/* prepare tables without thead and th" */
				var table_thead = table.querySelectorAll('thead');
				var table_th = table.querySelectorAll('th');
				var table_row = table.querySelectorAll('tr');
				if(table_thead.length == 0 && table_th.length == 0 && table_row.length > 1){
					var thead = document.createElement('thead');
					var table__thead = table.appendChild(thead);

					var tr = document.createElement('tr');
					var tr_object = table__thead.appendChild(tr);

					var table_rows = table_row[0].querySelectorAll('td');
					for(var j = 0; j < table_rows.length; j++) {
						var header_name = "#" + (j + 1);

						tr_object.appendChild(document.createElement("th")).appendChild(document.createTextNode(header_name));
					}
				}

				/* If there’s no tHead but the first tBody row contains ths, create a tHead and move that row into it. */
				if(table.tBodies.length == 0){
					continue;
				}
				var firstTBodyRow = table.tBodies[0].rows[0];
				if (!table.tHead && firstTBodyRow.children[0].tagName === 'TH') {
					var tHead = document.createElement('thead');
					tHead.appendChild(firstTBodyRow);
					table.insertBefore(tHead, table.firstChild);
				}
			}
		},
		highlight:function(){
			if(CONDITIONAL_FORMATTING == false)
				return;
			parseNumber = function(a) {
				a = a.toString()
					.replace(/\u20ac/g, '') /* dollar */
					.replace(/\u0024/g, '') /* euro */
					.replace(/%/g, '')
					.replace(/,/g, '')
					.replace(/ /g, '')
					.replace(/:/g, '.')
					.replace(/\u00A0/g, ''); /* &nbsp; */

				if(a.toLowerCase().indexOf('k') > -1 && a.replace(/k$/ig, '').match(numberRegExp)){
					a = (parseFloat(a.replace(/k$/ig, '')) * 1000).toString();
				}
				else if(a.toLowerCase().indexOf('m') > -1 && a.replace(/m$/ig, '').match(numberRegExp)){
					a = (parseFloat(a.replace(/m$/ig, '')) * 1000 * 1000).toString();
				}

				return a;
			};

			var tables = document.querySelectorAll(CONDITIONAL_FORMATTING_QUERY);
			for(var i = 0; i < tables.length; i++) {
				/*tables*/
				var numeric_cols_map = [];
				var table_data = [];
				var rows = tables[i].querySelectorAll('tbody tr');
				var rows_count = rows.length;
				if(rows_count < 1)
					continue;
				for(var j = 0; j < rows.length; j++) {
					/*rows*/
					table_data[j] = [];
					var cells = rows[j].querySelectorAll('td');
					for(var k = 0; k < cells.length; k++) {
						/*cells*/
						table_data[j][k] = cells[k];
						var value = cells[k].innerText;
						var value = parseNumber(value);
						if(value == '' || value == '-' || value.toLowerCase() == 'n/a') value = '0';
						if(typeof numeric_cols_map[k] == 'undefined')
							numeric_cols_map[k] = 1;
						if(!value.match(numberRegExp)){
							/*mark row as not numeric*/
							numeric_cols_map[k] = 0;
						}
					}
				}

				/* we have wanted cols */
				for(var j = 0; j < numeric_cols_map.length; j++) {
					if(numeric_cols_map[j] == 0)
						continue;

					/* find min and max */
					var min = null;
					var max = null;
					for(var k = 0; k < rows_count; k++) {
						var value = this.getNodeValue(table_data[k][j]);
						value = parseNumber(value);
						if(value == '' || value == '-' || value.toLowerCase() == 'n/a')
							continue;
						value = parseFloat(value);

						if(value < min || min === null) min = value;
						if(value > max || max === null) max = value;
					}
					if(min == max)
						continue;
					/*loop again and set color*/
					for(var k = 0; k < rows_count; k++) {
						var node = table_data[k][j];

						var value = this.getNodeValue(table_data[k][j]);
						var value = parseNumber(value);
						if(value == '' || value == '-' || value.toLowerCase() == 'n/a')
							continue;
						value = parseFloat(value);

						var delta = (value - min) * 100 / (max - min); /* in range of [0 - 100] */
						var exp_level = 4; /* fading average range */
						var total_fade_level = 1.5; /* is colors too strong? */

						if(delta > 50){
							delta = Math.pow(delta / 100, exp_level) * 100;
							var weight = 100 - delta * (100 - 54) / total_fade_level / 100;
							node.style.setProperty("background-color", 'hsl(151, 42%, '+weight+'%)', "important"); /* min 54% or 77  */
						}
						else if(delta < 50){
							delta = 100 - Math.pow((100 - delta) / 100, exp_level) * 100;
							var weight = 100 - (100 - delta) * (100 - 68) / total_fade_level / 100;
							node.style.setProperty("background-color", 'hsl(5, 70%, '+weight+'%)', "important"); /* min 68% or 84 */
						}
					}
				}
			}
		},
		init: function(options) {
			var table, tables, _i, _len, _results;
			if (options == null) {
				options = {};
			}
			if (options.selector == null) {
				options.selector = TABLES_QUERY;
			}
			tables = document.querySelectorAll(options.selector);
			_results = [];
			for (_i = 0, _len = tables.length; _i < _len; _i++) {
				table = tables[_i];

				if (!table.tHead){
					console.log("Table can not be sorted: there are no headers.", table);
				}
				else if (table.tHead.rows.length != 1){
					console.log("Table can not be sorted: first header has more than 1 row.", table);
				}
				else {
					/* sortable */
					table.classList.add('sortable');
				}

				_results.push(sortable.initTable(table));
			}
			return _results;
		},
		initTable: function(table) {
			var i, th, ths, _i, _len, _ref;
			if (((_ref = table.tHead) != null ? _ref.rows.length : void 0) !== 1) {
				return;
			}
			if (table.getAttribute('data-sortable-initialized') === 'true') {
				return;
			}
			table.setAttribute('data-sortable-initialized', 'true');
			ths = table.querySelectorAll('thead th');
			for (i = _i = 0, _len = ths.length; _i < _len; i = ++_i) {
				th = ths[i];
				if (th.getAttribute('data-sortable') !== 'false') {
					sortable.setupClickableTH(table, th, i);
				}
			}
			thft = table.querySelectorAll('tfoot th');
			for (i = _i = 0, _len = thft.length; _i < _len; i = ++_i) {
				th = thft[i];
				if (th.getAttribute('data-sortable') !== 'false') {
					sortable.setupClickableTH(table, th, i);
				}
			}
			return table;
		},
		setupClickableTH: function(table, th, i) {
			var eventName, onClick, type, _i, _len, _results;
			type = sortable.getColumnType(table, i);
			onClick = function(e) {
				var compare, item, newSortedDirection, position, row, rowArray, sorted, sortedDirection, tBody, ths,
					value, _compare, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _m, _ref, _ref1;
				if (e.handled !== true) {
					e.handled = true;
				} else {
					return false;
				}
				sorted = this.getAttribute('data-sorted') === 'true';
				sortedDirection = this.getAttribute('data-sorted-direction');
				if (sorted) {
					newSortedDirection = sortedDirection === 'ascending' ? 'descending' : 'ascending';
				} else {
					newSortedDirection = type.defaultSortDirection;
				}
				ths = this.parentNode.querySelectorAll('th');
				for (_i = 0, _len = ths.length; _i < _len; _i++) {
					th = ths[_i];
					th.setAttribute('data-sorted', 'false');
					th.removeAttribute('data-sorted-direction');
				}
				this.setAttribute('data-sorted', 'true');
				this.setAttribute('data-sorted-direction', newSortedDirection);
				tBody = table.tBodies[0];
				rowArray = [];
				if (!sorted) {
					if (type.compare != null) {
						_compare = type.compare;
					}
					else {
						_compare = function(a, b) {
							return b - a;
						};
					}
					compare = function(a, b) {
						if (a[0] === b[0]) {
							return a[2] - b[2];
						}
						if (type.reverse) {
							return _compare(b[0], a[0]);
						}
						else {
							return _compare(a[0], b[0]);
						}
					};
					_ref = tBody.rows;
					for (position = _j = 0, _len1 = _ref.length; _j < _len1; position = ++_j) {
						row = _ref[position];
						value = sortable.getNodeValue(row.cells[i]);
						if (type.comparator != null) {
							value = type.comparator(value);
						}
						rowArray.push([value, row, position]);
					}
					rowArray.sort(compare);
					for (_k = 0, _len2 = rowArray.length; _k < _len2; _k++) {
						row = rowArray[_k];
						tBody.appendChild(row[1]);
					}
				}
				else {
					_ref1 = tBody.rows;
					for (_l = 0, _len3 = _ref1.length; _l < _len3; _l++) {
						item = _ref1[_l];
						rowArray.push(item);
					}
					rowArray.reverse();
					for (_m = 0, _len4 = rowArray.length; _m < _len4; _m++) {
						row = rowArray[_m];
						tBody.appendChild(row);
					}
				}
				if (typeof window['CustomEvent'] === 'function') {
					return typeof table.dispatchEvent === "function"
						? table.dispatchEvent(new CustomEvent('Sortable.sorted', {
							bubbles: true
						})) : void 0;
				}
			};
			_results = [];
			for (_i = 0, _len = clickEvents.length; _i < _len; _i++) {
				eventName = clickEvents[_i];
				_results.push(addEventListener(th, eventName, onClick));
			}
			return _results;
		},
		getColumnType: function(table, i) {
			var row, specified, text, type, _i, _j, _len, _len1, _ref, _ref1, _ref2;
			specified = (_ref = table.querySelectorAll('th')[i]) != null ? _ref.getAttribute('data-sortable-type')
				: void 0;
			if (specified != null) {
				return sortable.typesObject[specified];
			}
			_ref1 = table.tBodies[0].rows;
			var types = [];
			for (_i = 0, _len = _ref1.length; _i < _len; _i++) { /* rows */
				row = _ref1[_i];
				text = sortable.getNodeValue(row.cells[i]);

				var text_simplified = text.replace(/ /g, '');
				text_simplified = text_simplified.replace(/\u00A0/g, ''); /* &nbsp; */
				if(text_simplified == '' || text_simplified == '-' || text_simplified.toLowerCase() == 'n/a'){
					/*empty cell - skip it*/
					continue;
				}

				_ref2 = sortable.types;
				for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) { /* types */
					type = _ref2[_j];
					if (type.match(text)) {
						types.push(type.name);
						break;
					}
				}
			}
			var uniquetypes = types.filter((v, i, a) => a.indexOf(v) === i);
			if(uniquetypes.length == 1){
				/*1 type - take it*/
				return sortable.typesObject[uniquetypes[0]];
			}
			/* use default - alpha */
			return sortable.typesObject.alpha;
		},
		getNodeValue: function(node) {
			var dataValue;
			if (!node) {
				return '';
			}
			dataValue = node.getAttribute('data-value');
			if (dataValue !== null) {
				return dataValue;
			}
			if(typeof node.children[0] != "undefined" && typeof node.children[0].value != "undefined"
				&& node.children[0].value){
				return ""+node.children[0].value;
			}
			if (typeof node.innerText !== 'undefined') {
				return node.innerText.replace(trimRegExp, '');
			}
			return node.textContent.replace(trimRegExp, '');
		},
		setupTypes: function(types) {
			var type, _i, _len, _results;
			sortable.types = types;
			sortable.typesObject = {};
			_results = [];
			for (_i = 0, _len = types.length; _i < _len; _i++) {
				type = types[_i];
				_results.push(sortable.typesObject[type.name] = type);
			}
			return _results;
		}
	};

	sortable.setupTypes([
		{
			name: 'numeric',
			defaultSortDirection: 'ascending',
			reverse: true,
			prepare: function(a) {
				a = a.toString();
				a = a.replace(/\u20ac/g, ''); /*euro*/
				a = a.replace(/\u0024/g, ''); /*dollar*/
				a = a.replace(/,/g, '');
				a = a.replace(/ /g, '');
				a = a.replace(/\u00A0/g, ''); /* &nbsp; */

				if(a.toLowerCase().indexOf('k') > -1 && a.replace(/k$/ig, '').match(numberRegExp)){
					a = (parseFloat(a.replace(/k$/ig, '')) * 1000).toString();
				}
				else if(a.toLowerCase().indexOf('m') > -1 && a.replace(/m$/ig, '').match(numberRegExp)){
					a = (parseFloat(a.replace(/m$/ig, '')) * 1000 * 1000).toString();
				}
				if(a == '-' || a.toLowerCase() == 'n/a') a = '0';

				return a;
			},
			match: function(a) {
				a = this.prepare(a);
				return a.match(numberRegExp);
			},
			comparator: function(a) {
				a = this.prepare(a);
				return parseFloat(a.replace(/[^0-9.-]/g, ''), 10) || 0;
			}
		},
		{
			name: 'date',
			defaultSortDirection: 'ascending',
			reverse: true,
			prepare: function(a) {
				if(a == '-' || a.toLowerCase() == 'n/a') a = '0000';
				return a;
			},
			match: function(a) {
				a = this.prepare(a);
				return !isNaN(Date.parse(a));
			},
			comparator: function(a) {
				a = this.prepare(a);
				return Date.parse(a) || 0;
			}
		},
		{
			name: 'time',
			defaultSortDirection: 'ascending',
			reverse: true,
			prepare: function(a) {
				a = a.replace(/:/g, '.'); /*change time to float*/
				if(a == '-' || a.toLowerCase() == 'n/a') a = '0';
				return a;
			},
			match: function(a) {
				a = this.prepare(a);
				return a.match(numberRegExp);
			},
			comparator: function(a) {
				a = this.prepare(a);
				return parseFloat(a.replace(/[^0-9.-]/g, ''), 10) || 0;
			}
		},
		{
			name: 'alpha', /* make sure it is last */
			defaultSortDirection: 'ascending',
			reverse: false,
			prepare: function(a) {
				return a;
			},
			match: function() {
				return true;
			},
			compare: function(a, b) {
				return a.localeCompare(b);
			}
		}
	]);

	setTimeout(function(){
		sortable.prepare();
		sortable.init();
		sortable.highlight();
	}, 0);

	if (typeof define === 'function' && define.amd) {
		define(function() {
			return sortable;
		});
	} else if (typeof exports !== 'undefined') {
		module.exports = sortable;
	} else {
		window.Sortable = sortable;
	}

})();
