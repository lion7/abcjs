// Simple WebMIDI player that sends the note events from a tune to a
// selected MIDI output device.

var createNoteMap = require('./create-note-map');

function WebMidiPlayer() {
    var self = this;
    self.midiAccess = null;
    self.output = null;
    self.noteMapTracks = null;
    self.millisecondsPerMeasure = 1000;
    self.meterSize = 1;

    // Initialize with the visualObj (from renderAbc) or a sequence as CreateSynth does.
    self.init = function(options) {
        if (!options) options = {};
        var visualObj = options.visualObj;
        var sequence = options.sequence;
        if (visualObj) {
            self.flattened = visualObj.setUpAudio(options.options || {});
            self.millisecondsPerMeasure = options.millisecondsPerMeasure ? options.millisecondsPerMeasure : visualObj.millisecondsPerMeasure(self.flattened.tempo);
            self.meterSize = visualObj.getMeterFraction().num / visualObj.getMeterFraction().den;
        } else if (sequence) {
            self.flattened = sequence;
        } else {
            return Promise.reject(new Error('Must pass in either a visualObj or a sequence'));
        }
        self.noteMapTracks = createNoteMap(self.flattened);
        return navigator.requestMIDIAccess().then(function(access){
            self.midiAccess = access;
            return {status:'ok'};
        });
    };

    self.getOutputs = function() {
        if (!self.midiAccess) return [];
        return Array.from(self.midiAccess.outputs.values());
    };

    self.setOutput = function(id) {
        if (!self.midiAccess) return;
        self.output = self.midiAccess.outputs.get(id);
    };

    function scheduleNote(note, tempoMultiplier) {
        var start = note.start * tempoMultiplier * 1000;
        var duration = (note.end - note.start) * tempoMultiplier * 1000;
        setTimeout(function() {
            if (!self.output) return;
            self.output.send([0x90, note.pitch, note.volume]);
            self.output.send([0x80, note.pitch, 0], window.performance.now() + duration);
        }, start);
    }

    self.start = function() {
        if (!self.output) return Promise.reject(new Error('No MIDI output selected'));
        var tempoMultiplier = self.millisecondsPerMeasure / 1000 / self.meterSize;
        self.noteMapTracks.forEach(function(track){
            track.forEach(function(note){
                scheduleNote(note, tempoMultiplier);
            });
        });
        return Promise.resolve({status:'playing'});
    };

    self.stop = function() {
        if (self.output) {
            self.output.send([0xB0, 123, 0]); // all notes off
        }
    };
}

module.exports = WebMidiPlayer;
