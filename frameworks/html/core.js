sc_require('lib/worker-html');
sc_require('lib/mode-html');

SC.AceEditor.modes.push('html');

ace.config.get('$moduleUrls')['ace/mode/html_worker'] = sc_static('worker-html');