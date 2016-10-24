/*globals ace*/


/**
 SproutCore Ace Editor
 @author Nicolas Badia
 @author Maurits Lamers
 */

sc_require('lib/ace');

SC.AceEditorView = SC.View.extend({

  acceptsFirstResponder: true,

  mode: null, // mode: don't forget to include the correct framework for the mode you need

  editorTheme: null, // this cannot be called theme, because that would override the SC theming.

  value: null,

  docId: 'default',

  showGutter: true,

  wrappingBehavior: null,

  autoComplete: false,

  // @if (debug)
  debugAce: false,
  // @endif

  // readOnly
  aceEditor: null,

  _autoCompleteDidChange: function () {
    // before it can be turned on or off, we need the language tools
    if (!SC.AceEditor.extensions.contains('language_tools')) {
      SC.Logger.warn("SC.AceEditorView: You are trying to turn on autoComplete, but you did not include the language tools extension.");
      return;
    }
    var editor = this.get('aceEditor');
    if (!this.editor) return;
    var val = !!this.get('autoComplete');
    editor.setOption('enableBasicAutocompletion', val);
  }.observes('autoComplete'),

  _wrappingBehaviorDidChange: function () {
    var editor = this.get('aceEditor');
    if (!editor) return;
    var setting = !!this.get('wrappingBehavior');
    editor.setWrapBehavioursEnabled(setting);
  }.observes('wrappingBehavior'),

  tabSize: 2,

  _tabSizeDidChange: function () {
    var editor = this.get('aceEditor');
    if (!editor) return;
    editor.setBehavioursEnabled(this.get('tabSize'));
  }.observes('wrappingBehavior'),

  tokenizedValue: function () {
    var editor = this.get('aceEditor');
    if (!editor) return;
    var session = editor.session;
    if (!session) return;
    return session.getTokens(0);
  }.property('value').cacheable(),

  _showGutterDidChange: function () {
    var editor = this.get('aceEditor');
    if (!editor) {
      //@if(debug)
      SC.Logger.warn('Developer warning: SC.AceEditorView cannot set annotations when the editor has not been initialized!');
      //@endif
      return;
    }
    var value = !!this.get('showGutter');
    editor.renderer.setShowGutter(value);
  }.observes('showGutter'),

  annotations: function (key, value) {
    /*jshint unused: false*/
    var editor = this.get('aceEditor');
    if (!editor) {
      //@if(debug)
      SC.Logger.warn('Developer warning: SC.AceEditorView cannot set annotations when the editor has not been initialized!');
      //@endif
      return;
    }
    if (value !== undefined) {
      return editor.session.setAnnotations(value);
    }
    else {
      return editor.session.getAnnotations();
    }
  }.property(),

  didAppendToDocument: function() {
    var layerId = this.get('layerId');


    // @if (debug)
    if (this.debugAce) SC.Logger.log("_initAce", layerId, this.acceptsFirstResponder);
    // @endif

    var that = this,
        editor;
        //mode = this.get('mode');

    try {
      editor = this.aceEditor = ace.edit(layerId);
      editor.$blockScrolling = Infinity;
    }
    catch(e) {
      // @if (debug)
      SC.Logger.error(e);
      // @endif

      return;
    }

    this.updateAceValue();

    // need to create some delegate procedure for this

    // editor.keyBinding.addKeyboardHandler({
    //   // handleKeyboard: function(data, hashId, keyString, keyCode) {
    //   //   if ((hashId === 1 || hashId === 8) && keyCode === 83) return { command: this.command };
    //   // },
    //   // command: {
    //   //   exec: function(editor) {
    //   //     var ret = that.save();
    //   //     return ret;
    //   //   }
    //   // }
    // });

    var session = editor.getSession();
    this.configureSession(session);

    var theme = this.get('editorTheme');
    if (theme) {
      editor.setTheme("ace/theme/" + theme);
    }
    // editor.setTheme("ace/theme/vibrant_ink");

    if (!this.get('showGutter')) {
      editor.renderer.setShowGutter(false);
    }

    // prevent a weird warning;
    editor.$blockScrolling = Infinity;


    editor.setShowPrintMargin(false);

    editor.on("blur", function(e) {
      // @if (debug)
      if (that.debugAce) SC.Logger.log("ACE_DEBUG: blur", e);
      // @endif
    });

    editor.on("focus", function(e) {
      // @if (debug)
      if (that.debugAce) SC.Logger.log("ACE_DEBUG: focus", e);
      // @endif

      SC.run(function() {
        that.becomeFirstResponder();
      });
    });

    // editor.container.addEventListener("drop", function(evt) { that.handleDrop(evt); }, false);

    this.didInitAce();

    return editor;
  },

  didInitAce: function() {

  },


  aceEditorValueDidChange: function() {
    var editor = this.aceEditor;

    if (!this.get('isEnabled')) return false;

    // Ce test: editor.getValue() || this.get('value') évite que si on discardChange, un string vide
    // soit défini à value ce qui réactiverais le bouton enregistré si value est un object
    // The test editor.getValue() || this.get('value') prevents the problem that when on discardChange
    // an empty string gets defined as value which would reactivate the 'register'? button when the value
    // is an object
    if (editor && (!SC.none(editor.getValue()) || !SC.none(this.get('value')))) {
      this.set('value', editor.getValue());
    }

  },


  aceValueDidChange: function() {
    // give the time to the session to update
    this.invokeOnceLater('updateAceValue');
  }.observes('value'),

  updateAceValue: function(forceUpdate) {
    var editor = this.aceEditor,
      value = this.get('value'),
      valueToSet;

    // On ne permet pas de changement si l'éditeur n'est pas affiché car dans ce cas,
    // lorsque l'éditeur gagne le focus, les changements ne sont pas visible
    // We don't allow the change when the editor is not attached, otherwise the editor
    // would gain focus and the changes would not be not visible.
    if (editor) {
      if (value !== editor.getValue()) {
        valueToSet = value;
      }
      else {
        if (forceUpdate === true) {
          valueToSet = editor.getValue();
        }
      }

      if (valueToSet != null) {
        editor.setValue(valueToSet);
      }

      editor.clearSelection();
    }
  },


  // Ne doit pas être mi à jour. Sinon, lorsque ace est fait firstResponder
  // l'editeur est supprimé par la fonction render
  // it is not necessary to be done immediately. Otherwise, unless ace is made firstResponder
  // the editor is surpessed by the render function
  updateLayer: function() { return false; },

  viewDidResize: function() {
    sc_super();

    // only apply when the editor is active.
    // Utile si on redimmensionne pendant que l'éditeur est actif
    if (this.aceEditor) this.aceEditor.resize();
  },

  // prevents change if the editor is disabled
  // Permet d'empecher la saisie si l'éditeur est désactivé
  isEnabledDidChange: function() {
    var aceEditor = this.aceEditor;
    if (!aceEditor) return;

    if (!this.get('isEnabled')) aceEditor.setReadOnly(true);
    else aceEditor.setReadOnly(false);
  }.observes('isEnabled'),

  destroy: function() {
    var sessions = this._aceSessions || {};

    for(var ai in sessions) {
      var as = sessions[ai];
      as.destroy();
    }

    this._aceSessions = null;

    sc_super();
  },


  // ..........................................................
  // SESSION
  //

  _aceSessions: null,

  aceSessions: function(value) {
    var sp = this._aceSessions;
    if (!sp) sp = this._aceSessions = {};
    return sp;
  }.property(),

  docIdDidChange: function() {
    var aceEditor = this.aceEditor;
    if (!aceEditor) return;

    var aceSessions = this.get('aceSessions'),
      aceRef = this.get('docId'),
      session = aceSessions[aceRef];

    if (!session) {
      session = ace.createEditSession(this.get('value') || '', this.getMode());
      this.configureSession(session);
    }

    aceEditor.setSession(session);
  }.observes('docId'),

  configureSession: function(session) {
    var that = this;
    this.get('aceSessions')[this.get('docId')] = session;
    var mode = this.getMode();
    session.setMode(mode);
    session.setUseSoftTabs(true);
    // session.setTabSize(2);
    this._tabSizeDidChange(); // apply tab size setting
    this._wrappingBehaviorDidChange(); // apply wrapping setting
    session.setUseWrapMode(true);

    session.on('change', function(e) {
      // @if (debug)
      if (that.debugAce) SC.Logger.log("ACE_DEBUG: change - editorValue: '"+editor.getValue()+"' value: '"+that.get('value')+"'");
      // @endif

      SC.run(function() {
        that.aceEditorValueDidChange();
      });
    });
  },


  // Needed if we use Ace from the WysiwygView of collection page and if we change the page (since the WysiwygView will remain the same)
  aceVisibilityDidChange: function() {
    if (this.get('isVisibleInWindow')) {
      this.updateAceValue(true);

      this.viewDidResize();
    }
    else {
      // Important if the editor is in a panel because otherwise it remains firstResponder
      // and keyboardEvents are mapped to the editor
      // Important si l'éditeur est dans un pane car sinon, il reste firstResponder
      // et les keyboardEvents restent mappé sur l'éditeur
      this.resignFirstResponder();
    }
  }.observes('isVisibleInWindow'),


  // ..........................................................
  // MODE
  //

  modeDidChange: function() {
    var aceEditor = this.aceEditor;
    if (!aceEditor) return;

    // make sure the session has been updated
    this.invokeNext(function() {
      aceEditor.getSession().setMode(this.getMode());
    });
  }.observes('mode'),

  getMode: function() {
    var mode = this.get('mode');

    //@if(debug)
    if (!SC.AceEditor.modes.contains(mode)) {
      SC.Logger.warn("Developer Warning: You selected a mode for SC.AceEditorView which has not been loaded. Please check your buildtools configuration!");
    }
    //@endif
    //
    // switch(mode) {
    //   case 'html': mode = 'html'; break;
    //   case 'js': mode = 'javascript'; break;
    // }

    return "ace/mode/"+mode;
  },


  // ..........................................................
  // UPLOAD
  //

  handleDrop: function(evt) {
    // should call delegate
  },

  didUpload: function(response, isImage) {
    // should call delegate
  },

});


