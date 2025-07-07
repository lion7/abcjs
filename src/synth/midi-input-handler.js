// Helper class to route note on events from a MIDI input device into the
// ABC editor. This provides a very simple mapping from MIDI note numbers to
// ABC note names and inserts them at the current cursor position.

var pitchToNoteName = require('./pitch-to-note-name');

function noteNameToAbc(name) {
    var letter = name[0];
    var accidental = name.length === 3 ? name[1] : '';
    var octave = parseInt(name[name.length - 1], 10);
    var acc = '';
    if (accidental === 'b') acc = '_';
    if (accidental === '#') acc = '^';
    var diff = octave - 4;
    var base = diff > 0 ? letter.toLowerCase() : letter.toUpperCase();
    var marks = '';
    if (diff > 0) marks = Array(diff).fill("'").join('');
    if (diff < 0) marks = Array(-diff).fill(',').join('');
    return acc + base + marks;
}

function MidiInputHandler(editor) {
    var self = this;
    self.editor = editor;
    self.midiAccess = null;
    self.input = null;

    self.init = function() {
        return navigator.requestMIDIAccess().then(function(access){
            self.midiAccess = access;
            return {status:'ok'};
        });
    };

    self.getInputs = function() {
        if (!self.midiAccess) return [];
        return Array.from(self.midiAccess.inputs.values());
    };

    self.setInput = function(id) {
        if (!self.midiAccess) return;
        if (self.input) self.input.onmidimessage = null;
        self.input = self.midiAccess.inputs.get(id);
        if (self.input) {
            self.input.onmidimessage = function(ev) {
                var data = ev.data;
                if (!data || data.length < 3) return;
                if ((data[0] & 0xf0) === 0x90 && data[2] > 0) {
                    var name = pitchToNoteName[data[1]];
                    if (!name) return;
                    var abc = noteNameToAbc(name) + ' ';
                    if (self.editor && self.editor.editarea && self.editor.editarea.insertAtCursor)
                        self.editor.editarea.insertAtCursor(abc);
                }
            };
        }
    };
}

module.exports = MidiInputHandler;
