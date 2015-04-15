/**
 * Visual Markdown Editor Field for Kirby 2
 *
 * @version   1.1.0
 * @author    Jonas Döbertin <hello@jd-powered.net>
 * @copyright Jonas Döbertin <hello@jd-powered.net>
 * @link      https://github.com/JonasDoebertin/kirby-visual-markdown
 * @license   GNU GPL v3.0 <http://opensource.org/licenses/GPL-3.0>
 */

/**
 * Visual Markdown Editor CodeMirror Wrapper
 *
 * @since 1.2.0
 */
var VisualMarkdownEditor = function($, $element, options) {

    var self = this;

    this.$element = $element;
    this.codemirror = null;

    this.options = {};
    this.defaults = {
        toolbar: true,
        header1: 'h1',
        header2: 'h2',
        codemirror: {
            theme:          'visualmarkdown',
            tabSize:        4,
            indentWithTabs: false,
            lineWrapping:   true,
            extraKeys: {
                "Enter":    'newlineAndIndentContinueMarkdownList',
            },
            mode: {
                name:                  'markdown',
                highlightFormatting:   true,
                underscoresBreakWords: false,
                maxBlockquoteDepth:    0,
                fencedCodeBlocks:      true,
                taskLists:             false,
                strikethrough:         false
            },
        }
    };

    /**
     * Actions
     *
     * @since 1.2.0
     */
    this.actions = {
        header1: function() {
            var header = self.translateHeaderValue(self.options.header1);
            self.toggleHeader(header);
        },
        header2: function() {
            var header = self.translateHeaderValue(self.options.header2);
            self.toggleHeader(header);
        },
        bold: function () {
            self.insertAround('**', '**')
        },
        italicize: function () {
            self.insertAround('*', '*')
        },
        blockquote: function () {
            self.insertBefore('> ', 2);
        },
        orderedList: function () {
            self.insertBefore('1. ', 3);
        },
        unorderedList: function () {
            self.insertBefore('* ', 2);
        },
        link: function () {
            self.insertAround('[', '](http://)');
        },
        image: function () {
            self.insertBefore('(image: filename.jpg)');
        },
        line: function() {
            self.insert('****');
        },
        code: function () {
            self.insertAround('```\r\n', '\r\n```')
        },
        fullscreen: function() {
            self.toggleFullscreenMode();
        }
    };

    /**
     * Toolbar Icons
     *
     * @since 1.2.0
     */
    this.tools = [
        {
            name: 'h1', //self.options.header1,
            action: 'header1',
            className: 'markdownfield-icon-text markdownfield-icon-header1',
            showName: true,
        },
        {
            name: 'h2', //self.options.header2,
            action: 'header2',
            className: 'markdownfield-icon-text markdownfield-icon-header1',
            showName: true,
        },
        {
            name: 'divider',
        },
        {
            name: "bold",
            action: "bold",
            className: "fa fa-bold"
        },
        {
            name: "italicize",
            action: "italicize",
            className: "fa fa-italic"
        },
        {
            name: "blockquote",
            action: "blockquote",
            className: "fa fa-quote-left"
        },
        {
            name: "unorderedList",
            action: "unorderedList",
            className: "fa fa-list"
        },
        {
            name: "orderedList",
            action: "orderedList",
            className: "fa fa-list-ol"
        },
        {
            name: 'divider',
        },
        {
            name: "link",
            action: "link",
            className: "fa fa-link"
        },
        {
            name: "image",
            action: "image",
            className: "fa fa-image"
        },
        {
            name: 'line',
            action: 'line',
            className: 'fa fa-minus'
        },
        {
            name: "fullScreen",
            action: "fullscreen",
            className: "fa fa-expand"
        }
    ];

    /**
     * Keymaps
     *
     * @since 1.2.0
     */
    this.keyMaps = {
        "Cmd-H":     'header1',
        "Cmd-Alt-H": 'header2',
        "Cmd-B":     'bold',
        "Cmd-I":     'italicize',
        "Cmd-'":     'blockquote',
        "Cmd-Alt-L": 'orderedList',
        "Cmd-L":     'unorderedList',
        "Cmd-Alt-I": 'image',
        "Cmd-A":     'link'
    };

    /**
     * Initialization
     *
     * @since 1.2.0
     */
    this.init = function(options) {

        // Merge defaults with options
        self.options = $.extend({}, self.defaults, options);

        // Register key bindings
        self.registerKeyMaps(self.keyMaps);

        // Initialize CodeMirror
        self.codemirror = CodeMirror.fromTextArea(self.$element.get(0), self.options.codemirror);

        // Initialize toolbar
        if(self.options.toolbar) {
            self.initToolbar();
        }

        // Bind change handler
        self.codemirror.on('renderLine', self.renderLine);

        // Refresh CodeMirror DOM
        self.codemirror.refresh();
    };

    /**
     * Initialize the toolbar
     *
     * @since 1.2.0
     */
    this.initToolbar = function() {

        var toolbar = $('<ul>').addClass('visualmarkdown-toolbar'),
            tools   = self.generateToolbarItems(self.tools),
            wrapper = self.codemirror.getWrapperElement();

        tools.forEach(function(tool) {
            toolbar.append(tool)
        });

        $(wrapper).parent().prepend(toolbar);
    };

    /**
     * Register keymaps by extending the extraKeys object
     *
     * @since 1.2.0
     */
    this.registerKeyMaps = function() {

        for(var name in self.keyMaps) {

            // Abort if action doesn't have a callback
            if(typeof(self.actions[self.keyMaps[name]]) !== 'function')
                throw "VisualMarkdownEditor: '" + self.keyMaps[name] + "' is not a registered action";

            var obj = {};
            obj[name] = self.actions[self.keyMaps[name]].bind(self);
            $.extend(self.options.codemirror.extraKeys, obj);
        }
    };

    /**
     * Generate a list of <li> tags for the available tools
     *
     * @since 1.2.0
     */
    this.generateToolbarItems = function(tools) {

        return tools.map(function(tool) {

            // Generate elements
            var $item = $('<li>').addClass(tool.name),
                $anchor = $('<a>');

            // Don't do anything with divider elements.
            // They are just an empty <li> tag with a "divider" class.
            if(tool.name == 'divider') {
                return $item;
            }

            // Add the tools name as anchor class.
            if(tool.className) {
                $anchor.addClass(tool.className);
            }

            // Add the tools name as text, if necessary.
            if(tool.showName) {
                $anchor.text(tool.name);
            }

            // Bind the action callback to the anchors "click" event.
            if(tool.action) {
                $anchor.on('click', function(e) {
                    self.codemirror.focus();
                    self.actions[tool.action].call(self);
                });
            }

            // Join the list item and the anchor.
            $item.append($anchor);

            return $item;
        });
    };

    /**
     * Handle a click on the toggle fullscreen mode icon
     *
     * @since 1.2.0
     */
    this.toggleFullscreenMode = function() {

        // Abort if fullscreen mode isn't supported
        if(!screenfull.enabled) {
            return;
        }

        // Find related wrapper element
        var wrapper = $(self.codemirror.getWrapperElement()).closest('.markdownfield-wrapper');

        // Enable fullscreen mode
        if(!screenfull.isFullscreen) {
            screenfull.request(wrapper.get(0));

        // Disable fullscreen mode
        } else {
            screenfull.exit();
        }
    };

    /**
     * Insert a string at cursor position
     *
     * @since 1.2.0
     */
    this.insert = function(insertion) {
        var doc    = self.codemirror.getDoc(),
            cursor = doc.getCursor();

        doc.replaceRange(insertion, {
            line: cursor.line,
            ch: cursor.ch
        });
    };

    /**
     * Insert a string at the start and end of a selection
     *
     * @since 1.2.0
     */
    this.insertAround = function(start, end) {
        var doc    = self.codemirror.getDoc(),
            cursor = doc.getCursor();

        if(doc.somethingSelected()) {

            var selection = doc.getSelection();
            doc.replaceSelection(start + selection + end);

        } else {

            // If no selection then insert start and end args and set cursor position between the two.
            doc.replaceRange(start + end, {
                line: cursor.line,
                ch: cursor.ch
            });
            doc.setCursor({
                line: cursor.line,
                ch: cursor.ch + start.length
            });

        }
    };

    /**
     * Insert a string before a selection
     *
     * @since 1.2.0
     */
    this.insertBefore = function(insertion, cursorOffset) {
        var doc    = self.codemirror.getDoc(),
            cursor = doc.getCursor();

        if(doc.somethingSelected()) {

            var selections = doc.listSelections();
            selections.forEach(function(selection) {
                var pos = [selection.head.line, selection.anchor.line].sort();

                for(var i = pos[0]; i <= pos[1]; i++) {
                    doc.replaceRange(insertion, { line: i, ch: 0 });
                }

                doc.setCursor({ line: pos[0], ch: cursorOffset || 0 });
            });

        } else {
            doc.replaceRange(insertion, {
                line: cursor.line,
                ch: 0
            });
            doc.setCursor({
                line: cursor.line,
                ch: cursorOffset || 0
            });
        }
    };

    /**
     * Insert or remove header formatting
     *
     * @since 1.2.0
     */
    this.toggleHeader = function(header) {
        var doc    = self.codemirror.getDoc(),
            cursor = doc.getCursor()
            line   = doc.getLine(cursor.line);

        if(line.indexOf(header + ' ') == 0) {

            // Remove header formatting
            // TODO: Enable support for multiple selections
            var start  = { line: cursor.line, ch: 0 },
                end    = { line: cursor.line, ch: line.length };
            doc.replaceRange(line.substr(header.length + 1), start, end);

        } else {

            // Add header formatting
            self.insertBefore(header + ' ', header.length + 1);
        }
    };

    this.renderLine = function(instance, line, element) {

        var $line = $(element).children('span');

        // Style hanging quote indents
        self.maybeApplyHangingQuoteStyles(element, $line);
    };

    /**
     * Maybe apply hanging quote styles to a line
     *
     * @since 1.2.0
     */
    this.maybeApplyHangingQuoteStyles = function(element, $line) {

        var $parts = $line.children('span');
            level = 0,
            padding = 0;

        // Abort if the line doesn't start with quote formatting
        if(!$parts.first().hasClass('cm-formatting-quote')) {
            return;
        }

        // Calculate quote level and required padding
        $part = $parts.first();
        while($part.hasClass('cm-formatting-quote')) {
            level++;
            padding += $part.actual('outerWidth', {clone: true});
            $part = $part.next();
        }
        padding += level * 3;

        // Apply padding and text-indent styles
        element.style.textIndent = '-' + padding + 'px';
        element.style.paddingLeft = (padding + 4) + 'px';
    };

    /**
     * Return the underlying CodeMirror instance
     *
     * @since 1.2.0
     */
    this.getCodeMirrorInstance = function() {
        return self.codemirror;
    };

    /**
     * Translate a header value string (h1 to h6) into it's
     * markdown representation.
     *
     * @since 1.2.0
     */
    this.translateHeaderValue = function(value) {
        switch(value) {
            case 'h6':
                return '######';
            case 'h5':
                return '#####';
            case 'h4':
                return '####';
            case 'h3':
                return '###';
            case 'h2':
                return '##';
            case 'h1':
            default:
                return '#';
        }
    };

    /**
     * Run initialization
     */
    return this.init(options);

}