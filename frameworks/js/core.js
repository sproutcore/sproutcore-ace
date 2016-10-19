/*globals ace*/

SC.AceEditor.modes.push('javascript');

ace.config.get('$moduleUrls')['ace/mode/javascript_worker'] = sc_static('worker-javascript');