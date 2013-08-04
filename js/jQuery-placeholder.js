/* jshint -W014 */
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

    //TODO IE8
    //Require jQuery


    var INSTANCE_KEY = "placeholder-instance",
        NAN = 0 / 0;


    var hasOwn = {}.constructor.hasOwnProperty,
        slice = [].slice,
        document = global.document,
        setTimeout = global.setTimeout,
        clearTimeout = global.clearTimeout;

    var hook = (function(){
        function defineHook( hookKind, hookKey, fnType, fn ) {
            var hooks = $[hookKind],
                hook = hooks[hookKey],
                orig = null;

            if( hook ) {
                orig = hook[fnType];
            }
            else {
                hook = hooks[hookKey] = {};
            }

            if( fnType === "set" ) {
                hook[fnType] = function( elem, value, name ) {
                    var ret;
                    if( orig ) {
                        ret = orig( elem, value, name );
                    }

                    return fn( elem, value, name ) || ret;
                };
            }
            else {
                hook[fnType] = function( elem, name ) {
                    var retOrig, ret;
                    if( orig ) {
                        retOrig = orig( elem, name );
                    }
                    ret = fn( elem, name );
                    return ret === null ? retOrig : ret;
                };
            }

        }

        return {
            define: defineHook,

            GETTER: "get",
            SETTER: "set",

            ATTR: "attrHooks",
            PROP: "propHooks",
            VAL: "valHooks"
        };
    })();

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

    //Return NaN if the element is not affected by its zIndex
    //even if it has zIndex
    //Return NaN if the element doesn't have a zIndex
    var rpositioned = /^\s*(?:relative|absolute|fixed)\s*$/i;
    function getZIndex( $elem ) {
        return rpositioned.test( $elem.css("position") )
                ? parseInt( $elem.css( "zIndex" ) + "", 10 )
                : NAN;


    }

    function getPosition( $elem ) {
        var ret = $elem.position();
        ret.left += numericCss( $elem, "marginLeft" );
        ret.top += numericCss( $elem, "marginTop" );
        return ret;
    }

    function numericCss( $elem, key ) {
        return parseInt( $elem.css( key ), 10 ) || 0;
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


    function debounce( fn, time, ctx ) {
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
        boxSizing: "content-box",
        pointerEvents: "none",
        backgroundColor: "transparent",
        backgroundImage: "none",
        cssFloat: "none",
        display: "block",
        wordWrap: "break-word"

    };

    function makePlaceholder() {
        return $("<div>")
            .css( css )
            .addClass( $.fn.placeholder.options.styleClass )
            .data( INSTANCE_KEY, true );
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

        function Placeholder( elem, options ) {
            this._elem = $(elem);

            var text = "" + (this._elem.attr( "placeholder" ) ||
                this._elem.data("placeholder" ) ||
                options.text ||
                $.fn.placeholder.options.text);

            this._elem.removeAttr( "placeholder" );

            this._text = text;
            this._hideOnFocus = !!parseOption(
                options,
                this._elem,
                "hideOnFocus"
            );

            this._placeholder = makePlaceholder();
            this._state = UNINITIALIZED;
            this._id = getId();
            this._offsetCache = null;
            this._parentCache = null;

            this._onPossibleStateChange = debounce(
                this._onPossibleStateChange, 13, this
            );
            this._onFocus = debounce( this._onFocus, 13, this );

            this._elem.on(
                "cut.placeholder change.placeholder "+
                "input.placeholder paste.placeholder " +
                "mouseup.placeholder keydown.placeholder " +
                "keyup.placeholder " +
                "keypress.placeholder blur.placeholder focusout.placeholder",
                this._onPossibleStateChange
            );

            this._elem.on(
                "destroy.placeholder",
                $.proxy( this.destroy, this )
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
            this._parentCache = this._elem[0].parentNode;

            this._placeholder.off( ".placeholder" )
                .detach()
                .text( this._text )
                .on( "click.placeholder focusin.placeholder " +
                    "focus.placeholder", this._onFocus )
                .on( "selectstart.placeholder", preventDefault )
                .insertAfter( this._elem );

            var zIndex = getZIndex( this._elem );

            if( isFinite( zIndex ) ) {
                this._placeholder.css( "zIndex", zIndex + 1 );
            }
            else {
                this._placeholder.css( "zIndex", "" );
            }

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
                    this._placeholder.removeClass(
                        $.fn.placeholder.options.focusedClass
                    );
                    this._show();
                    break;

                case FOCUSED:
                    this._placeholder.addClass(
                        $.fn.placeholder.options.focusedClass
                    );
                    this._show();
                    break;

                case FILLED:
                    this._placeholder.removeClass(
                        $.fn.placeholder.options.focusedClass
                    );
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
            var offset = getPosition( this._elem ),
                cached = this._offsetCache;

            //Don't update position again if
            //the reattach was performed from ._checkRemoved()
            if( !this._checkRemoved() ||
                !cached ||
                (cached.left !== offset.left ||
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

            var offset = getPosition( el ),
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
            this._elem.data( "placeholder", this._text );
        };

        var setter = function( elem, value ) {
            var instance = $.data( elem, INSTANCE_KEY );
            if( !instance ) {
                return;
            }
            elem.value = value;
            instance._onPossibleStateChange();
            return true;
        };

        $.each( ("textarea text password " +
            "tel email search url number").split( " " ), function( i, input ) {
            hook.define( hook.VAL, input, hook.SETTER, setter );
        });

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
        var options = $.extend( {}, option || {} );
        return this.filter( "textarea,input" ).each( function() {

            var $this = $( this ),
                data = $this.data( INSTANCE_KEY );
            if( !data ) {
                data = new Placeholder( this, options );
                $this.data( INSTANCE_KEY, data );
            }
            if( typeof option === "string" &&
                option.charAt(0) !== "_" &&
                typeof data[option] === "function" ) {
                data[option].apply(
                    data,
                    arguments.length > 1
                        ? [].slice.call( arguments, 1 )
                        : []
                );
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
        $( "textarea[placeholder],input[placeholder]" ).placeholder();
    };

    $.fn.placeholder.Constructor = Placeholder;

    $( $.fn.placeholder.refresh );


})(this, this.jQuery);