(function($) {


	var Autofill = function(element, options) {
		$.data(element, 'autofill', this);
		this._process_options(options);

		this.element = $(element);
		this.isInput = this.element.is('input');

		this.inputField = this.isInput ? this.element : this.element.find('input');

		this.picker = $(TPGlobal.template);

		this._buildPicker();
		this._buildEvents();
		this._attachEvents();
		
	}

	Autofill.prototype = {

		constructor: Autofill,

		_process_options: function(opts) {

			this._o = $.extend({}, this._o, opts);

			var o = this.o = $.extend({}, this._o);

			var plc = String(o.orientation).toLowerCase().split(/\s+/g),
				_plc = o.orientation.toLowerCase();
			plc = $.grep(plc, function(word) {
				return /^auto|left|right|top|bottom$/.test(word);
			});
			o.orientation = {
				x: 'auto',
				y: 'auto'
			};
			if(!_plc || _plc === 'auto')
			; // no action
			else if(plc.length === 1) {
				switch(plc[0]) {
					case 'top':
					case 'bottom':
						o.orientation.y = plc[0];
						break;
					case 'left':
					case 'right':
						o.orientation.x = plc[0];
						break;
				}
			} else {
				_plc = $.grep(plc, function(word) {
					return /^left|right$/.test(word);
				});
				o.orientation.x = _plc[0] || 'auto';

				_plc = $.grep(plc, function(word) {
					return /^top|bottom$/.test(word);
				});
				o.orientation.y = _plc[0] || 'auto';
			}

			if(o.delay==null){
				if(o.url != null){
					o.delay = 400;
				}else{
					o.delay = 10;
				}
			}
			
		},

		_buildPicker: function(){
			if(this.o.width!=null){
				this.picker.css("min-width",this.o.width);
			}else{
				var width = this.inputField.outerWidth();
				this.picker.css("min-width",width);
			}
		},

		_buildOptions: function(data){
			var html = "";
			var _this = this;
			data = this.o.responseHandler(data);
			$.each(data,function(i,v){
				if(i+1>_this.o.limit){return false};
				html += "<li class='autofill-item' data-value='"+v.value+"'>"+(_this.o.formatter(v,i))+"</li>";
			});
			this.picker.find(".autofill-list").html(html);
			this.show();			
		},

		_getSuggestionsLocal: function (query) {
            var that = this,
                queryLowerCase = query.toLowerCase(),
                filter = this.o.lookupFilter,
                limit = parseInt(this.o.limit, 10),
                data;

            data = {
                suggestions: $.grep(this.o.lookup, function (suggestion) {
                    return filter(suggestion, query, queryLowerCase);
                })
            };

            if (limit && data.suggestions.length > limit) {
                data.suggestions = data.suggestions.slice(0, limit);
            }

            return data;
        },

		_query: function(){
			var value = this.inputField.val();
			var await = this.await;
			var _this = this;
			clearTimeout(this.clockId);
			this.clockId = setTimeout(function(){
				_this.await = false;
				
				if(_this.o.url != null){
					$.ajax({
						url: _this.o.url,
						data: _this.o.extendParams({value: value}),
						type: "GET",
						success: function(data){
							_this._buildOptions(data);
						}
					});
				}else{
					var data = this._getSuggestionsLocal(value);
					_this._buildOptions(data);
				}
			},this.o.delay);
			if(await == true){
				return;
			}else{
				this.await = true;
			}
		},

		_events: [],
		_secondaryEvents: [],

		_applyEvents: function(evs) {

			for(var i = 0, el, ch, ev; i < evs.length; i++) {
				el = evs[i][0];
				if(evs[i].length === 2) {
					ch = undefined;
					ev = evs[i][1];
				} else if(evs[i].length === 3) {
					ch = evs[i][1];
					ev = evs[i][2];
				}
				el.on(ev, ch);
			}
		},
		_unapplyEvents: function(evs) {
			for(var i = 0, el, ev, ch; i < evs.length; i++) {
				el = evs[i][0];
				if(evs[i].length === 2) {
					ch = undefined;
					ev = evs[i][1];
				} else if(evs[i].length === 3) {
					ch = evs[i][1];
					ev = evs[i][2];
				}
				el.off(ev, ch);
			}
		},

		_buildEvents: function() {
			var events = {
				change: $.proxy(this.change, this)
			};
			if(this.o.showOnFocus === true) {
				events.focus = $.proxy(this.show, this);
			}

			if(this.isInput) { // single input
				this._events = [
					[this.element, events]
				];
			}

			this._events.push(
				// Component: listen for blur on element descendants
				[this.element, '*', {
					blur: $.proxy(function(e) {
						this._focused_from = e.target;
					}, this)
				}],
				// Input: listen for blur on element
				[this.element, {
					blur: $.proxy(function(e) {
						this._focused_from = e.target;
					}, this)
				}]
			);

			this._secondaryEvents = [
				[this.picker, {
					click: $.proxy(this.click, this)
				}],
				[this.inputField, {
					input: $.proxy(this._query, this)
				}],
				[$(window), {
					resize: $.proxy(this.place, this)
				}],
				[$(document), {
					'mousedown touchstart': $.proxy(function(e) {
						// Clicked outside the datepicker, hide it
						if(!(
								this.element.is(e.target) ||
								this.element.find(e.target).length ||
								this.picker.is(e.target) ||
								this.picker.find(e.target).length ||
								this.isInline
							)) {
							this.hide();
						}
					}, this)
				}]
			];
		},
		_attachEvents: function() {
			this._detachEvents();
			this._applyEvents(this._events);
		},
		_detachEvents: function() {
			this._unapplyEvents(this._events);
		},
		_attachSecondaryEvents: function() {
			this._detachSecondaryEvents();
			this._applyEvents(this._secondaryEvents);
		},
		_detachSecondaryEvents: function() {
			this._unapplyEvents(this._secondaryEvents);
		},
		_trigger: function(event) {
			this.element.trigger({
				type: event
			});
		},

		click: function(e) {
			e.preventDefault();
			e.stopPropagation();
			var $target;
			$target = $(e.target);
			if((!$target.hasClass('disabled')) && $target.hasClass('autofill-item')) {
				
				this.inputField.val($target.data("value"));
			}

//			if(this.picker.is(':visible') && this._focused_from) {
//				this._focused_from.focus();
//			}
			delete this._focused_from;
			this.hide();
		},

		show: function() {
			if(this.inputField.prop('disabled') || (this.inputField.prop('readonly') && this.o.enableOnReadonly === false))
				return;
			if($('.autofill').length > 0) return;
			this.picker.appendTo(this.o.container);
			this.place();
			this.picker.show();
//			this._input();
			this._attachSecondaryEvents();
			this._trigger('show');
			return this;
		},
		hide: function() {
			if(this.isInline || !this.picker.is(':visible'))
				return this;
			this.picker.hide().detach();
			this._detachSecondaryEvents();
			//			if (this.o.forceParse && this.inputField.val())
			//				this.setValue();
			this._trigger('hide');
			return this;
		},

		destroy: function() {
			this.hide();
			this._detachEvents();
			this.picker.remove();
			delete this.element.data().autofill;
			if(!this.isInput) {
				delete this.element.data().time;
			}
			return this;
		},

		place: function() {
			if(this.isInline)
				return this;
			var calendarWidth = this.picker.outerWidth(),
				calendarHeight = this.picker.outerHeight(),
				visualPadding = 10,
				container = $(this.o.container),
				windowWidth = container.width(),
				scrollTop = this.o.container === 'body' ? $(document).scrollTop() : container.scrollTop(),
				appendOffset = container.offset();
			var parentsZindex = [0];
			this.element.parents().each(function() {
				var itemZIndex = $(this).css('z-index');
				if(itemZIndex !== 'auto' && Number(itemZIndex) !== 0) parentsZindex.push(Number(itemZIndex));
			});
			var zIndex = Math.max.apply(Math, parentsZindex) + this.o.zIndexOffset;
			var offset = this.component ? this.component.parent().offset() : this.element.offset();
			var height = this.component ? this.component.outerHeight(true) : this.element.outerHeight(false);
			var width = this.component ? this.component.outerWidth(true) : this.element.outerWidth(false);
			var left = offset.left - appendOffset.left;
			var top = offset.top - appendOffset.top;

			if(this.o.container !== 'body') {
				top += scrollTop;
			}

			if(this.o.orientation.x !== 'auto') {
				if(this.o.orientation.x === 'right')
					left -= calendarWidth - width;
			}
			// auto x orientation is best-placement: if it crosses a window
			// edge, fudge it sideways
			else {
				if(offset.left < 0) {
					// component is outside the window on the left side. Move it into visible range
					left -= offset.left - visualPadding;
				} else if(left + calendarWidth > windowWidth) {
					// the calendar passes the widow right edge. Align it to component right side
					left += width - calendarWidth;
				} else {
					if(this.o.rtl) {
						// Default to right
					} else {
						// Default to left
					}
				}
			}

			// auto y orientation is best-situation: top or bottom, no fudging,
			// decision based on which shows more of the calendar
			var yorient = this.o.orientation.y,
				top_overflow;
			if(yorient === 'auto') {
				top_overflow = -scrollTop + top - calendarHeight;
				yorient = top_overflow < 0 ? 'bottom' : 'top';
			}

			if(yorient === 'top')
				top -= calendarHeight + parseInt(this.picker.css('padding-top'));
			else
				top += height;

			if(this.o.rtl) {
				var right = windowWidth - (left + width);
				this.picker.css({
					top: top,
					right: right,
					zIndex: zIndex
				});
			} else {
				this.picker.css({
					top: top,
					left: left,
					zIndex: zIndex
				});
			}
			return this;
		},
	}

	var AutofillPlugin = function(option) {

		var args = Array.apply(null, arguments);

		this.each(function() {
			var $this = $(this),
				data = $this.data('autofill'),
				options = typeof option === 'object' && option;

			if(!data) {

				opts = $.extend({}, defaults, options);

				data = new Autofill(this, opts);

				$this.data('autofill', data);
			}
			if(typeof option === 'string' && typeof data[option] === 'function') {
				internal_return = data[option].apply(data, args);
			}
		});

	}

	var TPGlobal = {

		template: '<div class="autofill">' +
			'	<ul class="autofill-list">' +

			'	</ul>' +
			'</div>',

	}

	$.fn.autofill = AutofillPlugin;

	var defaults = $.fn.autofill.defaults = {
		value: null,
		width: null,
		container: 'body',
		showOnFocus: true,
		orientation: "auto",
		delay: null,
		limit: 10,
		extendParams: function(obj){return obj},
		responseHandler: function(obj){return obj},
		formatter: function(row,index){return row.label},
		onChange: $.noop,
		lookupFilter: function (suggestion, originalQuery, queryLowerCase) {
            return suggestion.value.toLowerCase().indexOf(queryLowerCase) !== -1;
        }
	};
})(jQuery);