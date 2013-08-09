Placeholder plugin for jQuery. The placeholder doesn't use `.value` or `z-index` hacks. It also gives you a chance to style
the placeholder differently when the user has the input focused but hasn't yet typed anything, even CSS-transition animations are possible.

Markup/Data-API supported.

Usage
-----

The placeholder can only be called on textarea and input elements

    $('#my_input').placeholder(optionsObject)

Options
-------

* hideOnFocus - Boolean. The placeholder is always hidden when the input is in focus. By default empty inputs show the placeholder even while focused.
* text - String. The placeholder text to show. Defaults to `"Write something here..."`

Global Options
-------

Global options affect all placeholder instances, it is not possible to configure these on per-instance basis.

* styleClass - String. The CSS class given to the placeholder text containers. Defaults to `"jquery-placeholder-text"`
* focusedClass - String. An additional CSS class given to a placeholder container when focused. `"jquery-placeholder-text-focused"`

The class names are completely arbitrary and there should be no need to change them. If you need different styling on your page
for different inputs, then you should add CSS combinator rules. E.g.

    .red-form .jquery-placeholder-text {
        color: red;
    }

    .blue-form .jquery-placeholder-text {
        color: blue;
    }
    
To change a global option, the syntax is `$.fn.placeholder.options.optionName = newValue;`
    
Methods
-------

__.placeholder("destroy")__
Destroy the placeholder enhancement from an input. Needs to be called
when you are about to remove the target element, otherwise memory will be leaked.

    $("#some-input").placeholder("destroy");

You can also just trigger the event `"destroy"` on the target element

    $("#some-input").trigger("destroy")
    
Markup/Data-API
--------

You can use the placeholder plugin without extra javascript by specifying data attributes on the element:

    <input type="text" placeholder="Write something here...">

The text for the placeholder is picked up from the attribute's value. You may specify the `hideOnFocus` option by:

    data-placeholder-hide-on-focus="true"
    
The plugin will automatically disable native placeholder.
   
**Note:** dynamically created elements need to be called manually with javascript. You may also call `$.fn.placeholder.refresh()` at any point to instantiate any
uninitialized `data-placeholder` inputs. It is automatically called once on DOM ready event which makes the data API work.

See [the demo page](http://petkaantonov.github.io/jQuery-placeholder/demo.html) for a better overview

Building
----------

Clone or download the repository, and while in the project root, run:

    npm install
    grunt
    
Builds will appear in the `/js` folder. The source code cannot be ran directly without building.