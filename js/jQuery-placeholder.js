/**
 * @preserve Copyright (c) 2012 Petka Antonov
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function(global, $) {
    "use strict";

    //TODO positional tests and IE 
    //Require jQuery


    var INSTANCE_KEY = "placeholder-instance";

        
    var hasOwn = {}.constructor.hasOwnProperty,
        slice = [].slice,
        document = global.document,
        setTimeout = global.setTimeout,
        clearTimeout = global.clearTimeout;
            
    var boxSizingProp = (function(){
        var props = ["boxSizing", "mozBoxSizing", "webkitBoxSizing"],
            divStyle = document.createElement("div").style;
            
        for( var i = 0; i < props.length; ++i ) {
            if( props[i] in divStyle ) {
                return props[i];
            }
        }
        return props[0];
    })();


    function numericCss( $elem, key ) {
        return parseInt( $elem.css( key ), 10 );
    }
    
    function isBorderBox( $elem ) {
        return $elem.css( boxSizingProp ) === "border-box";
    }
    
    function getLeftBorderWidth( $elem ) {
        return numericCss( $elem, "borderLeftWidth") +
            numericCss( $elem, "paddingLeft");
    }

    function getTopBorderWidth( $elem ) {
        return numericCss( $elem, "borderTopWidth") +
            numericCss( $elem, "paddingTop");
    }
    
    function getWidth( $elem ) {
        if( isBorderBox( $elem ) ) {
            return numericCss( $elem, "width" );
        }
        else {
            return $elem[0].offsetWidth ? $elem.width() : 0;
        }
    }
    function getHeight( $elem ) {
        if( isBorderBox( $elem ) ) {
            return numericCss( $elem, "height" );
        }
        else {
            return $elem[0].offsetHeight ? $elem.height() : 0;
        }
    }
            
    var dasherize = ( function () {
        var rcamel = /([A-Z])/g,
            camel2dash = function( g, m1 ) {
                return "-" + m1.toLowerCase();
            };
    
        return function( str ) {
            return ("" + str).replace( rcamel, camel2dash );
        };
    
    })();
    

    function throttle( fn, time, ctx ) {
        var timerId = 0;
        var ret = function() {
            clearTimeout( timerId );
            var self = ctx || this,
                args = slice.call( arguments );
                
            timerId = setTimeout( function() {
                fn.apply( self, args );
            }, time );
        };
        
        ret.cancel = function() {
            clearTimeout( timerId );
        };
        return ret;
    }

    function parseOption( options, $elem, key ) {
        if( options && hasOwn.call( options, key ) ) {
            return options[key];
        }
        else {
            var dashed = "placeholder-" + dasherize( key );
            if( $elem[0].hasAttribute( "data-" + dashed ) ) {
                return $elem.data( dashed );
            }
            else {
                return $.fn.placeholder.options[key];
            }
        }
    }
    
    var css = {
        outline: "none",
        cursor: "text",
        zoom: 1,
        position: "absolute",
        overflow: "hidden",
        mozBoxSizing: "content-box",
        webkitBoxSizing: "content-box",
        pointerEvents: "none",
        boxSizing: "content-box"
    };
 
    function makePlaceholder() {
        return $("<div>").css( css ).addClass( $.fn.placeholder.options.styleClass );
    }
    
    function preventDefault(e) {
        e.preventDefault();
    }

    var Placeholder = (function() {
        var method = Placeholder.prototype;
        
        var getId = (function() {
            var id = 0;
            return function() {
                return ("" + (id++));
            };
        })();
        
        var UNINITIALIZED = {},
            UNFOCUSED = {},
            FOCUSED = {},
            FILLED = {};
        
        function Placeholder( elem, text, options ) {
            this._elem = $(elem);
            this._text = "" + (text || options.text || $.fn.placeholder.options.text);
            this._hideOnFocus = !!parseOption( options, this._elem, "hideOnFocus");
            this._placeholder = makePlaceholder();
            this._state = UNINITIALIZED;
            
            this._id = getId();
            
            this._offsetCache = null;
            this._parentCache = null;
                        
            this._onPossibleStateChange = throttle( this._onPossibleStateChange, 13, this );
            this._onFocus = throttle( this._onFocus, 13, this );
                        
            this._elem.on(
                "cut.placeholder change.placeholder input.placeholder paste.placeholder " +
                "mouseup.placeholder keydown.placeholder keyup.placeholder " +
                "keypress.placeholder blur.placeholder focusout.placeholder",
                this._onPossibleStateChange
            );
            
            this._reattach();            
        }
        
        //For hashmap
        method.toString = function() {
            return this._id;      
        };
        
        method._reattach = function() {
            this._offsetCache = null;
            this._state = UNINITIALIZED;
            var parent = this._parentCache = this._elem[0].parentNode;
        
            this._placeholder.off( ".placeholder" )
                .detach()
                .text( this._text )
                .on( "click.placeholder focusin.placeholder focus.placeholder", this._onFocus )
                .on( "selectstart.placeholder", preventDefault )
                .appendTo( parent );
                
            this._updateState();
        };
        
        method._onPossibleStateChange = function() {
            this._updateState();
        };
        
        method._onFocus = function() {
            this._elem.focus();
            this._updateState();
        };
        
        method._updateState = function() {
            var prevState = this._state;
            if( this._elem.val() ) {
                this._state = FILLED;
            }
            else {
                if( document.activeElement === this._elem[0] ) {
                    if( this._hideOnFocus ) {
                        this._state = FILLED;
                    }
                    else {
                        this._state = FOCUSED;
                    }
                }
                else {
                    this._state = UNFOCUSED;
                }
            }
            if( prevState !== this._state ) {
                this._actOnChangedState();
            }
        };
        
        method._actOnChangedState = function() {
            switch( this._state ) {
                case UNFOCUSED: 
                    this._placeholder.removeClass( $.fn.placeholder.options.focusedClass );
                    this._show();
                    break;
                    
                case FOCUSED:
                    this._placeholder.addClass( $.fn.placeholder.options.focusedClass );
                    this._show();                    
                    break;
                    
                case FILLED:
                    this._placeholder.removeClass( $.fn.placeholder.options.focusedClass );
                    this._hide();
                    break;
                    
                default: throw new Error("Invalid state");
            
            }
        };
        
        //Return true if a complete reattach was performed
        method._checkRemoved = function() {
            if( this._placeholder[0].parentNode !== this._parentCache ||
                this._elem[0].parentNode !== this._parentCache
            ) {
                this._reattach();
                return true;
            }
            return false;
        };
        
        method._updatePositionIfChanged = function() {
            var offset = this._elem.position(),
                cached = this._offsetCache;
            
            //Don't update position again if the reattach was performed from ._checkRemoved()
            if( !this._checkRemoved() || !cached || (cached.left !== offset.left || 
                cached.top !== offset.top) ) {
                this._updatePosition();
            }
        };
        
        var nullOffsetCache = {left: 0, top: 0};
        method._updatePosition = function() {
            var el = this._elem,
                width = getWidth( el ),
                height = getHeight( el );
            
            //Don't deal with hidden inputs
            if( !width || !height ) {
                this._offsetCache = nullOffsetCache;
                this._placeholder.hide();
                return;
            }
            
            var offset = el.position(),
                pl = this._placeholder;
              
            this._offsetCache = offset;
            
            pl.css({
                width: width,
                height: height,
                left: offset.left + getLeftBorderWidth( el ),
                top: offset.top + getTopBorderWidth( el )
            }).show();
        };
        
        method._show = function() {
            this._placeholder.show();
            this._updatePositionIfChanged();
            tracker.track( this );
        };
        
        method._hide = function() {
            this._placeholder.hide();
            tracker.untrack( this );
        };
        
        method.update = function() {
            this._updateState();
            this._updatePosition();
        };
        
        method.destroy = function() {
            tracker.untrack( this );
            this._onPossibleStateChange.cancel();
            this._onFocus.cancel();
            this._placeholder.off( ".placeholder" ).remove();
            this._elem.off( ".placeholder" ).removeData( INSTANCE_KEY );
            this._parentCache = null;
            
        };
        
        var tracker = (function() {
            var timerId = 0,
                tracking = false;
                
            var trackedInstances = {};
                
                
            function track() {
                for( var i in trackedInstances ) {
                    if( hasOwn.call( trackedInstances, i ) ) {
                        trackedInstances[i]._updatePositionIfChanged();
                    }
                }
                timerId = setTimeout( track, 45 );
            }
            
            function isEmpty( obj ) {
                for( var i in obj ) {
                    if( hasOwn.call( obj, i ) ) {
                        return false;
                    }
                }
                return true;
            }
        
            return {
                check: function() {
                    if( !isEmpty( trackedInstances ) ) {
                        if( !tracking ) {
                            tracking = true;
                            timerId = setTimeout( track, 45 );
                        }
                    }
                    else if( tracking ) {
                        clearTimeout( timerId );
                        tracking = false;
                        timerId = 0;
                    }
                },
                
                track: function( instance ) {
                    trackedInstances[instance] = instance;
                    this.check();
                },
                
                untrack: function( instance ) {
                    delete trackedInstances[instance];
                    this.check();
                }
            };
        })();
        

        return Placeholder;
    })();


    $.fn.placeholder = function( option ) {
        return this.filter( "textarea,input" ).each( function( option ) {
            
            var $this = $( this ),
                text = $this.data( "placeholder" ),
                data = $this.data( INSTANCE_KEY );
            
            if( !data ) {
                $this.data( INSTANCE_KEY, ( data = new Placeholder( this, text, $.extend( {}, option || {} ) ) ) );
            }
            if( typeof option == 'string' && option.charAt(0) !== "_" && data[option].apply ) {
                data[option].apply( data, arguments.length > 1 ? [].slice.call( arguments, 1 ) : [] );
            }
        });
    };
    
    $.fn.placeholder.options = {
        hideOnFocus: false,
        text: "Write something here...",
        styleClass: "jquery-placeholder-text",
        focusedClass: "jquery-placeholder-text-focused"
    };
    
    $.fn.placeholder.refresh = function() {
        $( "textarea[data-placeholder], input[data-placeholder]" ).placeholder();
    };

    $.fn.placeholder.Constructor = Placeholder;
    
    $($.fn.placeholder.refresh);
    

    
    
})(this, this.jQuery);