/*
 * A combo box plugin that supports auto complete.
 * 
 */
(function($) {
	$.fn.combobox = function (options) {
		
		/**
		 * This plugin supports 2 methods of input.
		 * 1. Map Select element - Map a drop down element which will be used to build the 
		 *                         auto complete options 
		 * 2. data               - List of objects which will be used to build the auto complete
		 *                         options. This plugin supports 2 formats,
		 *    a. format1         - [{key: option_text, value: option_value},{key: option_text, value: option_value}, {key: option_text, value: option_value}]
		 *                         A list of objects in above format.
		 *    b. format2         - [{name: option_text, id: option_value},{name: option_text, id: option_value}]
		 *                         A list of objects in above format. In this case, the listKey and listValue options should be a valid string
		 *                         matching the key the in object.
		 *                         
		 *  Additionally you can pass options like highlight: true and selected: true in the options.
		 */		
		var o = {
			optionEl: null, /* Optional if data is not empty, else this is a mandatory option. */
			data: [],       /* Optional if optionEl is not empty, else this is a mandatory option. */
			listKey: null,  /* If data contains a list of object, then listKey is the property name*/
			listValue: null,/* If data contains a list of object, then listValue is the property value*/
			height:	'auto',
			width:	null,	/* By default, the width of the combo box will be same as the width of the triggering element*/
			onSelect: $.noop,
			filterType: 'starts-with' /*Filter options: contains, starts-with*/
		};
		
		$.extend(o, options);
		
		//Template for building the auto complete option
		var bTmpl = {
			base : '<ul class="cb-wrapper zero-opacity" id="{ID}" tabindex="-1" unselectable="on" class="unselectable">{OPTIONS}</ul>',
			options : '<li class="cb-item" tabindex="-1" data-value="{OPTION_VALUE}" data-index="{INDEX}" unselectable="on" class="unselectable" {TITLE}>{OPTION_TEXT}</li>'
		};
		
		return this.each (function () {
			var $this = $(this);			
			var cWrapperID = this.id + '-cb';
			
			$this.focus(function (e) { //show auto complete options

				e.stopPropagation();
				var $comboBox = $('#' + cWrapperID);
				if ($comboBox.length) { //retrieve the list and update
					
					var $li = $comboBox.find('li');
					
					if ($li.length) {//show only if there is atleast 1 li
						//remove any active class
						$li.removeClass('active');
						
						$comboBox.removeClass('zero-opacity').show();						
					}
				} else { //building the options for the first time			
					
					var cBoxOptions = buildCombobox.call($this);
					
					if (cBoxOptions.length) {
						var cDiv = bTmpl.base
										.replace(/{ID}/, cWrapperID)
										.replace(/{OPTIONS}/, cBoxOptions.join(''));
						
						$this.after(cDiv);				   //append the list to dom	
						
						$comboBox = $('#' + cWrapperID);
						$comboBox
							.removeClass('zero-opacity')   //zero opacity technique is used to locate the position of the textbox and attach it below it.
							.bind('onSelect', function () {
								o.onSelect.call($comboBox);
							});						
						
					}
				}
				
				//always position before show to fix the resolution/resize issues
				var pos = $this.position();
				$comboBox.css({
					left: pos.left,
					top: pos.top + $(this).outerHeight() + 1,
					width: o.width,
					height: o.height
				});
				
				
				$(this).keyup();
			}).blur(function () {     //hide auto complete options
				var $comboBox = $('#' + cWrapperID);

				/** Below is a timed function to decide if the focus from the textbox is jumped
				 * to the combobox or outside to other element. If it is on other element, the combobox
				 * should be collapsed. */
				setTimeout(function () {
					if (document.activeElement.id != $comboBox[0].id &&
							$(document.activeElement).parent()[0].id != $comboBox[0].id) $comboBox.hide();
				}, 50);
				
				//var selOpt = $(this).data('opt-value');				
				
			}).keyup (function (e) { // filter results
				var $comboBox = $('#' + cWrapperID).show();
				
				var v = this.value.toUpperCase();
				if (o.filterType && v.length) {
					var $options = $comboBox.find('li');
					var $hideOptions = $options.show().filter(function () {
						switch (o.filterType) { 
							case 'starts-with': 
								return $(this).text().toUpperCase().indexOf(v) != 0;
							case 'contains':
								return $(this).text().toUpperCase().indexOf(v) < 0;
						}
					});
					
					if ($hideOptions.length == $options.length){ //hide combo box if no match found (hide all)
						$comboBox.hide();
					} else if ($hideOptions.length) {
						$hideOptions.hide();						
					}
				} else {
					$comboBox.find('li').show();
				}
				
				var $li = $comboBox.find('li.active'); 
				
				if ($li.length) {
					activeSelect($li, e);
				} else {
					if (e.which == 40 ) { //pressed down arrow to jump to suggestion box
						$comboBox.find('li:visible:first').addClass('active').focus();
					} else if (e.which == 38) { //up arrow
						$comboBox.find('li:visible:last').addClass('active').focus();
					}
				}
				
			}).bind('rebuild', function(){ /* This function is used specifically to rebuild the combobox, which re-reads the
			   src value and updates the combo box list 
			*/
				var cBoxOptions = buildCombobox.call($this);
				var $comboBox = $('#' + cWrapperID);
				
				if ($comboBox.length) {
					$comboBox
						.empty() // remove current options and rebuild new options
						.append(cBoxOptions.join('')); //append new options
				} else {
					var cDiv = bTmpl.base
						.replace(/{ID}/, cWrapperID)
						.replace(/{OPTIONS}/, cBoxOptions.join(''));
	
					$this.after(cDiv);	//append the list to dom
										
					$comboBox						
						.bind('onSelect', function () {
							o.onSelect.call($comboBox);
						});
				}
				
				//remove any active class
				$comboBox.find('li').removeClass('active');
				
			}).bind ('clear', function () {
				var $comboBox = $('#' + cWrapperID);
				
				if ($comboBox.length) {
					$comboBox.empty();
				}
				
			}).change(function () {
				$(this).data('opt-value', '');
			}).addClass('cb-box');
		});
		
		function buildCombobox () {
			//input method 1 - Build auto complete from a drop down
			if (o.data.length == 0) {
				var options = $(o.optionEl)[0].options;
				
				var cOptions = []; 
				//build options
				$.each (options, function (idx, el) {
					cOptions.push( bTmpl.options
										.replace(/{INDEX}/g, idx) //adding index to know which option was selected
										.replace(/{OPTION_VALUE}/g, el.value)  //added option value as data-value attribute
										.replace(/{OPTION_TEXT}/g, el.text)    //added option text as the li's html
										.replace(/{TITLE}/, (el.title)?('title ="' + el.title + '"'):'')); //added title for ellipsis
				});
				
				return cOptions;
			}
			
		}
		

	};
	
	$(document).click( function () {		
		//Don't hide the combobox if the next click is inside the box or the same textbox
		if (!$(document.activeElement).hasClass('cb-wrapper') &&
				!$(document.activeElement).hasClass('cb-box') && 
				!$(document.activeElement).hasClass('cb-item') ) {
			$('.cb-wrapper').hide();
		}
	}).delegate('.cb-wrapper li', 'click', function (){ /* Upgrade this to use .on as you update the jQuery js*/
		var $this = $(this);
		var $parentEl = $this.parent();
		var $el = $('#' + $parentEl[0].id.replace('-cb', ''));

		$el.val($this.text())
		   .data('opt-value', $this.attr('data-value'));
		
		$el[0].title = (this.title)?this.title:''; //set the title for the textbox if li had a title 
		
		$parentEl.hide().trigger('onSelect');

	}).delegate('.cb-item', 'keydown', function (e) {
		e.preventDefault();
		var $this = $(this);
		
		activeSelect($this, e);
		
		if (e.which == 13) { //enter key
			$(this).click();			
			e.stopPropagation();
		}
	}).delegate('.cb-item', 'mouseenter', function (e) { //background hover on mouse enter
		$(this).parent()           //traverse to parent element
			.find('.active')    //find if there are any active element 
			.removeClass('active');  //remove any such active class
		
		$(this).addClass('active').focus(); //Add class active to current LI
	}).delegate('.cb-item', 'mouseleave', function (e) { //remove background hover on mouse leave
		$(this).removeClass('active');  //remove class active
	});
	
	function activeSelect ($this, e) {
		var $ul = $this.parent();
		
		if (e.which == 40 ) { //pressed down arrow to jump to suggestion box			
			var $next = $this.next();
			if ($next.length) {
				$this.removeClass('active');
				$next.addClass('active').focus();
			} else { //depress down arrow from last record should take it to the first
				$this.removeClass('active');
				$ul.find('li:first').addClass('active').focus();
			} 
			
		} else if (e.which == 38) { //up arrow
			var $prev = $this.prev();
			if ($prev.length) {
				$this.removeClass('active');
				$prev.addClass('active').focus();
			} else { //depress up arrow from last record should take it to the last
				$this.removeClass('active');
				$ul.find('li:last').addClass('active').focus();
			} 
		}
	}
})(jQuery);