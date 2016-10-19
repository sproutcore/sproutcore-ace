# SproutCore Ace framework
This is a framework in progress which wraps the Ace code editor (https://ace.c9.io/) as a SproutCore view.

Ace is an editor with lots of modules, and including it as is would increase the size of a built SproutCore application hugely.
Because of the size and the incompatability between the loading system of Ace and the SproutCore build tools, setting 'sproutcore-ace' as dependency in your app only includes the editor without any modules or themes.

Every module lives in its own sub-framework and therefore has to be added to the dependencies of your app. So, in order to include the html mode, you need to add 'sproutcore-ace:html'. This should automatically also include the basic editor.

