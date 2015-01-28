function DenonDNS3700() {}

/*
  TODO: Start in a known platter state
  TODO: Load track
  TODO: Scroll text
  TODO: Display loaded track

  Later awesome features:
  TODO: Control sample deck
*/

DenonDNS3700.DEBUG_LEVEL = 2;

DenonDNS3700.CMD_CODE = 0xB0;

DenonDNS3700.ButtonChange = {
    ButtonReleased: 0x00,
    ButtonPressed: 0x40
}

DenonDNS3700.RotaryChange = {
    Left: 0x7F,
    Right: 0x00
}

DenonDNS3700.LedMode = {
    On: 0x4A,
    Off: 0x4B,
    Blink: 0x4C
}

DenonDNS3700.Led = {
    DiskEject: 0x01,
    Playlist: 0x02,
    PlatterModeGreen: 0x05,
    PlatterModeOrange: 0x06,
    Pitch: 0x07,
    KeyAdjust: 0x08,
    Tap: 0x09,
    EchoLoop: 0x0B,
    Flanger: 0x0D,
    Filter: 0x0F,
    AutoLoopSet: 0x2B,
    AutoLoopExit: 0x2C,
    One: 0x11,
    OneDimmer: 0x12,
    Two: 0x13,
    TwoDimmer: 0x14,
    Three: 0x15,
    ThreeDimmer: 0x16,
    NextTrack: 0x1D,
    Parameters: 0x1E,
    Effects: 0x2D,
    Flip: 0x23,
    A: 0x24,
    ADimmer: 0x3E,
    B: 0x40,
    BDimmer: 0x2A,
    Cue: 0x26,
    Play: 0x27,
    Brake: 0x28,
    Dump: 0x29,
    Reverse: 0x3A,
    ExitReloop: 0x42,
    LeftBezel: 0x43,
    RightBezel: 0x44,
    CdIn: 0x48
}

DenonDNS3700.PRESET_REQUEST = [
    0xF0, // start of system exlusive
    0x00, // id code: Denon DJ ID
    0x40, // ^
    0x03, // ^
    0x12, // communication format: one way
    
    0x04, // model number: DN-S3700
    0x00, // unit number: iterate this through 0x00 to 0x05
    0x7F, // midi channel: all
    0x50, // message type: polling
    0x21, // command: preset request
    
    0xF7  // end of system exclusive
];

DenonDNS3700.PRESET_UNIT_OFFSET = 6;
DenonDNS3700.NUMBER_OF_UNITS = 15;

// Just hard code the midi numbers for where to send characters rathen than try to figure
// out the bizarre allocation scheme by the manufacturer
DenonDNS3700.CHAR_MSBS = [
    [ 0x01, 0x02, 0x03, 0x04, 0x05, 0x07, 0x08, 0x09,
      0x0A, 0x0B, 0x0C, 0x0D, 0x58, 0x59, 0x5A, 0x5B ],
    [ 0x0E, 0x0F, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15,
      0x16, 0x17, 0x18, 0x19, 0x6C, 0x6D, 0x6E, 0x6F ]
];

DenonDNS3700.CHAR_LSBS = [
    [ 0x21, 0x22, 0x23, 0x24, 0x25, 0x27, 0x28, 0x29,
      0x2A, 0x2B, 0x2C, 0x2D, 0x5C, 0x5D, 0x5E, 0x5F ],
    [ 0x2E, 0x2F, 0x30, 0x31, 0x32, 0x33, 0x34, 0x35,
      0x36, 0x37, 0x38, 0x39, 0x70, 0x75, 0x76, 0x77 ]
];

// TODO: Track navigation; test with both
DenonDNS3700.MAX_NUM_CHARS = 16;
DenonDNS3700.EMPTY_CHAR = " ".charCodeAt(0);

DenonDNS3700.CHANNEL_CONNECTIONS = [
    {control: "bpm",     handler: "trackAvailableChanged"},
    {control: "keylock", handler: "updateKeylockDisplay"}
];

DenonDNS3700.TextDisplayState = {
    Empty: 0,
    Static: 1,
    Scroll: 2,
    Blink: 3
}

DenonDNS3700.PlaybackState = {
    Initializing: 0,
    Searching: 1,
    Paused: 2,
    Playing: 3,
}

DenonDNS3700.ledCache = [];
DenonDNS3700.textDisplayState = [ null, null ];
DenonDNS3700.textDisplayCache = [ [], [] ];
DenonDNS3700.textDisplayTimer = [ {}, {} ];

DenonDNS3700.requestPresetDataTimer = [];
DenonDNS3700.initFlashTimer = [];

/*
  Current text display functions:

  DenonDNS3700.clearTextDisplay = function(row, duration)
  DenonDNS3700.setTextDisplay = function(row, col, text, duration)
  DenonDNS3700.blinkTextDisplay = function(row, col, text, tickInterval, duration)

  TODO: DenonDNS3700.scrollTextDisplay = function(row, text, prefix)

  Text display functions for debugging:

  DenonDNS3700.debugFlash = function(str)
  DenonDNS3700.debugStateInfo = function(str)
*/

DenonDNS3700.startTimer = function(timer, delay, handler)
{
    DenonDNS3700.stopTimer(timer);
    timer.id = engine.beginTimer(delay, handler);
}

DenonDNS3700.stopTimer = function(timer) {
    if (timer.id > 0) {
        engine.stopTimer(timer.id);
        timer.id = 0;
    }
}

DenonDNS3700.makeChannelConnetions = function(enable)
{
    for (var i = 0; i < DenonDNS3700.CHANNEL_CONNECTIONS.length; ++i) {
        var obj = DenonDNS3700.CHANNEL_CONNECTIONS[i];
        engine.connectControl(DenonDNS3700.channel,
                              obj.control, "DenonDNS3700." + obj.handler,
                              !enable);
    }
}

DenonDNS3700.presetDataChanged = function (channel, control, value)
{
    DenonDNS3700.shutdown();
 
    // re-init
    DenonDNS3700.init(DenonDNS3700.id, DenonDNS3700.debug);
}

DenonDNS3700.init = function (id, debug)
{
    DenonDNS3700.id = id;
    DenonDNS3700.debug = debug;
      
    // Does not work in hybrid mode :(
    // TODO: Is there a way to start up in a known platter state?
    DenonDNS3700.turntableOff();

    DenonDNS3700.turnOffAllLeds();
    DenonDNS3700.setTextDisplay(0, 0, "Requesting");
    DenonDNS3700.setTextDisplay(1, 0, "Preset Data...");

    DenonDNS3700.deck = -1;
    DenonDNS3700.channel = null;
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Initializing;
    DenonDNS3700.startTimer(DenonDNS3700.requestPresetDataTimer, 500,
                            "DenonDNS3700.requestPresetDataTimerHandler");
}

DenonDNS3700.shutdown = function ()
{
    // display farewells, turn off the LEDs
    DenonDNS3700.setTextDisplay(0, 0, "Goodbye...");
    DenonDNS3700.clearTextDisplay(1);
    DenonDNS3700.turnOffAllLeds();
    
    // stop all timers
    DenonDNS3700.stopTimer(DenonDNS3700.initFlashTimer);
    DenonDNS3700.stopTimer(DenonDNS3700.requestPresetDataTimer);
    DenonDNS3700.stopTimer(DenonDNS3700.textDisplayTimer[0]);
    DenonDNS3700.stopTimer(DenonDNS3700.textDisplayTimer[1]);

    // remove existing connections
    if (DenonDNS3700.deck != -1) {
        DenonDNS3700.makeChannelConnetions(false);
    }
}


// used during initialization to obtain deck number from the preset data;
DenonDNS3700.inboundSysex = function (data, length)
{
    DenonDNS3700.deck = data[DenonDNS3700.PRESET_UNIT_OFFSET] + 1;
    DenonDNS3700.channel = "[Channel" + DenonDNS3700.deck + "]";   
}

DenonDNS3700.requestPresetDataTimerHandler = function()
{
    if (DenonDNS3700.deck < 0) { // keep trying. sometimes the device is not talkative
        for (var i = 0; i < DenonDNS3700.NUMBER_OF_UNITS; ++i) {
            DenonDNS3700.PRESET_REQUEST[DenonDNS3700.PRESET_UNIT_OFFSET] = i;
            midi.sendSysexMsg(DenonDNS3700.PRESET_REQUEST,
                              DenonDNS3700.PRESET_REQUEST.length);
        }
    } else {
        DenonDNS3700.stopTimer(DenonDNS3700.requestPresetDataTimer);
        var maxAllowedDecks = engine.getValue("[Master]","num_decks");
        if (DenonDNS3700.deck >= maxAllowedDecks) {
            DenonDNS3700.setTextDisplay(0, 0, "Deck Number Bad :(");
            DenonDNS3700.setTextDisplay(1, 0, "Hold MEMO > Select Unit No Set > " +
                                              "Select 1 through " + (maxAllowedDecks+1));
        } else {
            DenonDNS3700.initDisplayCounter = 8;
            DenonDNS3700.startTimer(DenonDNS3700.initFlashTimer, 500,
                                    "DenonDNS3700.initDisplayTimerHandler");
        }
    }
}

// timer handler for the initial startup flashiness
DenonDNS3700.initDisplayTimerHandler = function()
{
    if (DenonDNS3700.initDisplayCounter % 4 == 0) {
        DenonDNS3700.setTextDisplay(0, 0, "/    Hello,    \\");
        DenonDNS3700.setTextDisplay(1, 0, "\\    Mixxx     /");
        DenonDNS3700.tapLed(DenonDNS3700.LedMode.On);
    } else if (DenonDNS3700.initDisplayCounter % 2 == 0) {
        DenonDNS3700.setTextDisplay(0, 0, "12345678901234");
        DenonDNS3700.setTextDisplay(1, 0, "ABCDEFGHIJKLMN");
        DenonDNS3700.tapLed(DenonDNS3700.LedMode.On);
    } else {
        DenonDNS3700.clearTextDisplay(0);
        DenonDNS3700.clearTextDisplay(1);
        DenonDNS3700.tapLed(DenonDNS3700.LedMode.Off);
    }
    
    if (DenonDNS3700.initDisplayCounter == 0) {
        DenonDNS3700.finishInit();
    }
    --DenonDNS3700.initDisplayCounter;
}

// invoked from the timer handler when the flashy sequence is done
DenonDNS3700.finishInit = function (id)
{   
    // force into vinyl control? this is convenient but questionable
    engine.setValue(DenonDNS3700.channel, "vinylcontrol_enabled", true);

    // enable connections
    DenonDNS3700.makeChannelConnetions(true);
        
    // enter one of the playback states
    if (DenonDNS3700.isMixxxPlaying()) {
        DenonDNS3700.enterPlaying();
    } else {
        if (DenonDNS3700.isTrackLoaded()) {
            DenonDNS3700.enterPaused();
        } else {
            DenonDNS3700.enterSearching();
        }
    }

    // update things tied to the mixxx deck's state
    DenonDNS3700.updateKeylockDisplay();

    DenonDNS3700.stopTimer(DenonDNS3700.initFlashTimer);
    DenonDNS3700.setTextDisplay(0, 0, "Deck " + DenonDNS3700.deck + " Online :)");
}

DenonDNS3700.turntableOn = function()
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, 0x66, 0x7F);
}

DenonDNS3700.turntableOff = function()
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, 0x66, 0x00);
}

DenonDNS3700.commonLedOp = function(ledValue, mode)
{
    if (DenonDNS3700.ledCache[ledValue] == mode) {
        //DenonDNS3700.debugFlash("already set");
        return;
    } else {
        DenonDNS3700.ledCache[ledValue] = mode;
        midi.sendShortMsg(DenonDNS3700.CMD_CODE, mode, ledValue);
    }
}

DenonDNS3700.playLed = function(mode)
{
    DenonDNS3700.commonLedOp(DenonDNS3700.Led.Play, mode);
}

DenonDNS3700.cueLed = function(mode)
{
    DenonDNS3700.commonLedOp(DenonDNS3700.Led.Cue, mode);
}

DenonDNS3700.tapLed = function(mode)
{
    DenonDNS3700.commonLedOp(DenonDNS3700.Led.Tap, mode);
}

DenonDNS3700.effectsLed = function(mode)
{
    DenonDNS3700.commonLedOp(DenonDNS3700.Led.Effects, mode);
}

DenonDNS3700.parametersLed = function(mode)
{
    DenonDNS3700.commonLedOp(DenonDNS3700.Led.Parameters, mode);
}

DenonDNS3700.keyLed = function(mode) {
    DenonDNS3700.commonLedOp(DenonDNS3700.Led.KeyAdjust, mode);
}

DenonDNS3700.ejectLed = function(mode)
{
    DenonDNS3700.commonLedOp(DenonDNS3700.Led.DiskEject, mode);
}

DenonDNS3700.putChar = function(row, col, ch)
{
    if (DenonDNS3700.textDisplayCache[row][col] == ch) {
        return;
    } else {
        DenonDNS3700.textDisplayCache[row][col] = ch;
        
        var idxMsb = DenonDNS3700.CHAR_MSBS[row][col];
        var idxLsb = DenonDNS3700.CHAR_LSBS[row][col];
    
        midi.sendShortMsg(DenonDNS3700.CMD_CODE, idxMsb, (ch & 0xF0) >> 4);
        midi.sendShortMsg(DenonDNS3700.CMD_CODE, idxLsb, ch & 0x0F);
    }
}

DenonDNS3700.clearLine = function(row, colStart, colEnd)
{
    colStart = typeof colStart == 'undefined' ? 0 : colStart;
    colEnd = typeof colEnd == 'undefined' ? DenonDNS3700.MAX_NUM_CHARS-1 : colEnd;
    for (var i = colStart; i <= colEnd; ++i) {
        DenonDNS3700.putChar(row, i, DenonDNS3700.EMPTY_CHAR);
    }
}

DenonDNS3700.putString = function(row, col, str)
{
    for (var i = 0; i < str.length; ++i) {
        var x = col + i;
        if (x < DenonDNS3700.MAX_NUM_CHARS) {
            DenonDNS3700.putChar(row, x, str.charCodeAt(i));
        }
    }
}

DenonDNS3700.isMixxxPlaying = function()
{
    return engine.getValue(DenonDNS3700.channel, "play");
}

DenonDNS3700.isTrackLoaded = function()
{
    // TODO: is there a better way to do this?
    return (engine.getValue(DenonDNS3700.channel, "bpm") != 0);
}

DenonDNS3700.enterPlaying = function()
{
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Playing;
    DenonDNS3700.updatePlaybackDisplay();
}

DenonDNS3700.enterPaused = function()
{
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Paused;
    DenonDNS3700.updatePlaybackDisplay();
}

DenonDNS3700.enterSearching = function()
{
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Searching;
    DenonDNS3700.updatePlaybackDisplay();
}

DenonDNS3700.updatePlaybackDisplay = function()
{
    switch(DenonDNS3700.playbackState) {
    case DenonDNS3700.PlaybackState.Initializing:
        return;
        break;
    case DenonDNS3700.PlaybackState.Playing:
        if (DenonDNS3700.isTrackLoaded()) {
            var debugStateInfo = "Playing";
            var playLed = DenonDNS3700.LedMode.On;
            var cueLed = DenonDNS3700.LedMode.Off;
        } else {
            var debugStateInfo = "Platter ON/no track";
            var playLed = DenonDNS3700.LedMode.Blink;
            var cueLed = DenonDNS3700.LedMode.Blink;
        }
        var effectsLed = DenonDNS3700.LedMode.On;
        var parametersLed = DenonDNS3700.LedMode.On;
        break;
    case DenonDNS3700.PlaybackState.Paused:
        var debugStateInfo = "Paused";
        var playLed = DenonDNS3700.LedMode.Blink;
        var cueLed = DenonDNS3700.LedMode.Off;
        var effectsLed = DenonDNS3700.LedMode.On;
        var parametersLed = DenonDNS3700.LedMode.On;
        break;
    case DenonDNS3700.PlaybackState.Searching:
        var debugStateInfo = "Searching";
        var playLed = DenonDNS3700.LedMode.Off;
        var cueLed = DenonDNS3700.LedMode.On;
        var effectsLed = DenonDNS3700.LedMode.On;
        var parametersLed = DenonDNS3700.LedMode.Blink;
        break;
    default:
        var debugStateInfo = "Uknown State :(";
        var playLed = DenonDNS3700.LedMode.Blink;
        var cueLed = DenonDNS3700.LedMode.Blink;
        var effectsLed = DenonDNS3700.LedMode.Blink;
        var parametersLed = DenonDNS3700.LedMode.Blink;
        var trackLed = DenonDNS3700.LedMode.Blink;
        break;
    }

    var ejectLed = DenonDNS3700.isTrackLoaded() ? DenonDNS3700.LedMode.On
                                                : DenonDNS3700.LedMode.Off;
    
    DenonDNS3700.debugStateInfo(debugStateInfo);
    DenonDNS3700.playLed(playLed);
    DenonDNS3700.cueLed(cueLed);
    DenonDNS3700.effectsLed(effectsLed);
    DenonDNS3700.parametersLed(parametersLed);
    DenonDNS3700.ejectLed(ejectLed);
}

DenonDNS3700.updateKeylockDisplay = function()
{
    var keyOn = engine.getValue(DenonDNS3700.channel, "keylock");
    DenonDNS3700.keyLed(keyOn ? DenonDNS3700.LedMode.On : DenonDNS3700.LedMode.Off);
}

DenonDNS3700.turnOffAllLeds = function()
{
    for (var key in DenonDNS3700.Led) {
        var led = DenonDNS3700.Led[key];
        DenonDNS3700.commonLedOp(led, DenonDNS3700.LedMode.Off);
    }
}

DenonDNS3700.ejectButtonPressed = function(channel, control, value) {
    if (DenonDNS3700.playbackState == DenonDNS3700.PlaybackState.Playing
     && DenonDNS3700.isTrackLoaded() == true) {
        DenonDNS3700.userFlash("Play Lock");
    } else {
        engine.setValue(DenonDNS3700.channel, "eject", 1);
    }
}

DenonDNS3700.parametersRotaryChanged = function(channel, control, value)
{
    if (value == DenonDNS3700.RotaryChange.Left) {
        DenonDNS3700.debugFlash("Params Left");
        engine.setValue("[Playlist]", "SelectPrevTrack", 1);
    } else {
        DenonDNS3700.debugFlash("Params Right");
        engine.setValue("[Playlist]", "SelectNextTrack", 1);
    }
}

DenonDNS3700.parametersButtonPressed = function(channel, control, value)
{
    DenonDNS3700.debugFlash("Params Pressed");
    if (DenonDNS3700.playbackState == DenonDNS3700.PlaybackState.Playing
     && DenonDNS3700.isTrackLoaded() == true) {
        DenonDNS3700.userFlash("Play Lock");
    } else {
        engine.setValue(DenonDNS3700.channel, "LoadSelectedTrack", 1);
        DenonDNS3700.ejectLed(DenonDNS3700.LedMode.Blink);
    }
}

DenonDNS3700.playButtonChanged = function(channel, control, value)
{
    if (value == DenonDNS3700.ButtonChange.ButtonPressed) {
        DenonDNS3700.debugFlash("Play Pressed");
        if (DenonDNS3700.playbackState == DenonDNS3700.PlaybackState.Playing) {
            if (DenonDNS3700.isMixxxPlaying()) {
                DenonDNS3700.enterPaused();
            } else {
                DenonDNS3700.enterSearching();
            }
        } else {
            DenonDNS3700.enterPlaying();
        }
    }
}

DenonDNS3700.cueButtonChanged = function(channel, control, value)
{
    if (value == DenonDNS3700.ButtonChange.ButtonPressed) {
        DenonDNS3700.debugFlash("Cue Pressed");       
        if (DenonDNS3700.playbackState != DenonDNS3700.PlaybackState.Initializing) {
            DenonDNS3700.enterSearching();
        }
    }
}

DenonDNS3700.setTextDisplayState = function(row, state)
{
    if (DenonDNS3700.textDisplayTimer[row] != null) {
        DenonDNS3700.stopTimer(DenonDNS3700.textDisplayTimer[row]);
    }
    DenonDNS3700.textDisplayState[row] = state;
    DenonDNS3700.applyTextDisplayState(row, state);
}

DenonDNS3700.pushTextDisplayState = function(row, state)
{
    if (DenonDNS3700.textDisplayTimer[row] != null) {
        DenonDNS3700.stopTimer(DenonDNS3700.textDisplayTimer[row]);
    }
    state.prevState = DenonDNS3700.textDisplayState[row];
    DenonDNS3700.textDisplayState[row] = state;
    DenonDNS3700.applyTextDisplayState(row, state);
}

DenonDNS3700.applyTextDisplayState = function(row, state)
{
    switch(state.textDisplayState) {
    case DenonDNS3700.TextDisplayState.Empty:
        DenonDNS3700.clearLine(row);
        break;
    case DenonDNS3700.TextDisplayState.Static:
    case DenonDNS3700.TextDisplayState.Blink:
        DenonDNS3700.clearLine(row);
        DenonDNS3700.putString(row, state.colStart, state.text);
        break;
    }

    if (state.tickInterval > 0 && state.numTicks > 0) {
        DenonDNS3700.startTimer(DenonDNS3700.textDisplayTimer[row], state.tickInterval,
                                "DenonDNS3700.textDisplayTickHandler" + row);
    }
}

DenonDNS3700.textDisplayTickHandler0 = function()
{
    DenonDNS3700.processTextDisplayTick(0);
}

DenonDNS3700.textDisplayTickHandler1 = function()
{
    DenonDNS3700.processTextDisplayTick(1);
}

DenonDNS3700.processTextDisplayTick = function(row)
{
    var state = DenonDNS3700.textDisplayState[row];
    ++state.currTick;
    
    switch (state.textDisplayState) {
    case DenonDNS3700.TextDisplayState.Blink:       
        DenonDNS3700.clearLine(row);
        if (state.currTick % 2 == 0) {
           DenonDNS3700.putString(row, state.colStart, state.text);
        }
        break;
    }
    if (state.numTicks > 0 && state.currTick >= state.numTicks) {
        DenonDNS3700.stopTimer(DenonDNS3700.textDisplayTimer[row]);
        var prevState = state.prevState;
        delete DenonDNS3700.textDisplayState[row];
        DenonDNS3700.textDisplayState[row] = prevState;
        if (prevState != null) {
            DenonDNS3700.applyTextDisplayState(row, prevState);
        }
    }
}

DenonDNS3700.newEmptyDispState = function(duration)
{
    var obj = {
        textDisplayState : DenonDNS3700.TextDisplayState.Empty,
        tickInterval : duration,
        numTicks : 1,
        currTick : 0,
        prevState: null,
    }
    return obj;
}

DenonDNS3700.clearTextDisplay = function(row, duration)
{
    duration = (typeof duration == 'undefined') ? 0 : duration;
    var state = DenonDNS3700.newEmptyDispState(duration);
    DenonDNS3700.setTextDisplayState(row, state);
}

DenonDNS3700.newStaticDispState = function(col, text, duration)
{
    var obj = {
        textDisplayState : DenonDNS3700.TextDisplayState.Static,
        colStart : col,
        text : text,
        tickInterval : duration,
        numTicks : 1,
        currTick : 0,
        prevState: null,
    };
    return obj;
}

DenonDNS3700.setTextDisplay = function(row, col, text, duration)
{ 
    duration = (typeof duration == 'undefined' ? 0 : duration);
    var newState = DenonDNS3700.newStaticDispState(col, text, duration);

    if (DenonDNS3700.textDisplayState[row] != null
     && DenonDNS3700.textDisplayState[row].tickInterval > 0
     && DenonDNS3700.textDisplayState[row].numTicks > 0) {
        DenonDNS3700.textDisplayState[row].prevState = newState;
    } else {
        DenonDNS3700.setTextDisplayState(row, newState);
    }
}

DenonDNS3700.newBlinkDispState = function(col, text, tickInterval, duration)
{
    var obj = {
        textDisplayState : DenonDNS3700.TextDisplayState.Blink,
        colStart : col,
        text : text,
        tickInterval : tickInterval,
        numTicks : duration / tickInterval,
        currTick : 0,
        prevState: null,
    };
    return obj;
}

DenonDNS3700.blinkTextDisplay = function(row, col, text, tickInterval, duration)
{
    duration = (typeof duration == 'undefined' ? 0 : duration);
    var state = DenonDNS3700.newBlinkDispState(col, text, tickInterval, duration);
    if (DenonDNS3700.textDisplayState[row] != null
     && DenonDNS3700.textDisplayState[row].textDisplayState == state.textDisplayState) {
        state.prevState = DenonDNS3700.textDisplayState[row].prevState;
        DenonDNS3700.setTextDisplayState(row, state);
    } else {
        DenonDNS3700.pushTextDisplayState(row, state);
    }
}

DenonDNS3700.debugFlash = function(str)
{
    if (DenonDNS3700.DEBUG_LEVEL >= 2) {
        DenonDNS3700.blinkTextDisplay(1, 0, "<" + str + ">", 200, 800);
    }
}

DenonDNS3700.userFlash = function(str)
{
    DenonDNS3700.blinkTextDisplay(1, 0, "[" + str + "]", 200, 800);
}

DenonDNS3700.debugStateInfo = function(str)
{
    if (DenonDNS3700.DEBUG_LEVEL >= 1) {
        DenonDNS3700.setTextDisplay(1, 0, "mode: " + str);
    }
}

DenonDNS3700.trackAvailableChanged = function()
{
    var available = DenonDNS3700.isTrackLoaded();
    if (available) {
        DenonDNS3700.debugFlash("Track Loaded");
    } else {
        DenonDNS3700.debugFlash("Track Ejected");
        if (DenonDNS3700.playbackState == DenonDNS3700.PlaybackState.Paused) {
            DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Searching;
        }
    }
    DenonDNS3700.updatePlaybackDisplay();
}

