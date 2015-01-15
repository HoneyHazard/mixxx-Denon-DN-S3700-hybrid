function DenonDNS3700() {}

DenonDNS3700.LedMode = {
    On: 0x4A,
    Off: 0x4B,
    Blink: 0x4C
}

DenonDNS3700.ButtonChange = {
    ButtonReleased : 0x00,
    ButtonPressed : 0x40
}

DenonDNS3700.PlaybackState = {
    Initializing : 0,
    Searching : 1,
    Paused : 2,
    Playing : 3,
}

DenonDNS3700.DisplayState = {
    Empty : 0,
    Static : 1,
    Scroll : 2,
    Blink: 3
}

// TODO: Track navigation; test with both

DenonDNS3700.CMD_CODE = 0xB0;
DenonDNS3700.MAX_NUM_CHARS = 16;
DenonDNS3700.EMPTY_CHAR = " ".charCodeAt(0);
DenonDNS3700.DEBUG_LEVEL = 2;

// Just hard code the midi numbers rathen than try to figure out the bizarre allocation
// scheme by the manufacturer
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

DenonDNS3700.initDisplayCounter = 8;
DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Initializing;
DenonDNS3700.isTrackLoaded = false;

DenonDNS3700.displayState = [ null, null ];
DenonDNS3700.displayTimer = [ null, null ];

DenonDNS3700.init = function (id)
{
    DenonDNS3700.clearLine(0);
    DenonDNS3700.clearLine(1);
    DenonDNS3700.tapLed(DenonDNS3700.LedMode.Off);

    //var test = DenonDNS3700.newBlinkDispState(0, "test", 250, 5000);
    //var test = DenonDNS3700.newStaticDispState(0, "test", 5000);   
    //DenonDNS3700.pushDispState(0, test);
    //DenonDNS3700.setTextDisplay(0, 0, "a b c d e");
    //DenonDNS3700.blinkTextDisplay(0, 0, "test", 500, 5000);
    
    // Does not work in hybrid mode :(
    // Is there a way to start up in a known platter state?
    DenonDNS3700.turntableOff();

    DenonDNS3700.tapLed(DenonDNS3700.LedMode.Blink);
    DenonDNS3700.playLed(DenonDNS3700.LedMode.Off);

    DenonDNS3700.initFlashTimerId
        = engine.beginTimer(500, "DenonDNS3700.initDisplayTimerHandler()");
    
}

// Invoked from the timer handler
DenonDNS3700.finishInit = function (id)
{
    DenonDNS3700.tapLed(DenonDNS3700.LedMode.On);
    engine.stopTimer(DenonDNS3700.initFlashTimerId);
    DenonDNS3700.setTextDisplay(0, 0, "READY :)");
    DenonDNS3700.enterPaused();
}

DenonDNS3700.turntableOn = function()
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, 0x66, 0x7F);
}

DenonDNS3700.turntableOff = function()
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, 0x66, 0x00);
}

DenonDNS3700.playLed = function(mode)
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, mode, 0x27);
}

DenonDNS3700.cueLed = function(mode)
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, mode, 0x26);
}

DenonDNS3700.tapLed = function(mode)
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, mode, 0x09);    
}

DenonDNS3700.effectsLed = function(mode)
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, mode, 0x2D);
}

DenonDNS3700.parametersLed = function(mode)
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, mode, 0x1E);
}

DenonDNS3700.putChar = function(row, col, ch)
{
    var idxMsb = DenonDNS3700.CHAR_MSBS[row][col];
    var idxLsb = DenonDNS3700.CHAR_LSBS[row][col];
    
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, idxMsb, (ch & 0xF0) >> 4);
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, idxLsb, ch & 0x0F);
}

DenonDNS3700.printLine1 = function(str)
{
    DenonDNS3700.clearLine(0);
    DenonDNS3700.putString(0, 0, str);
}

DenonDNS3700.printLine2 = function(str)
{
    DenonDNS3700.clearLine(1);
    DenonDNS3700.putString(1, 0, str);
}

DenonDNS3700.clearLine = function(row, colStart, colEnd)
{
    colStart = typeof colStart == 'undefined' ? 0 : colStart;
    colEnd = typeof colEnd == 'undefined' ? DenonDNS3700.MAX_NUM_CHARS-1 : colEnd;
    for (i = colStart; i <= colEnd; ++i) {
        DenonDNS3700.putChar(row, i, DenonDNS3700.EMPTY_CHAR);
    }
}

DenonDNS3700.putString = function(row, col, str)
{
    for (i = 0; i < str.length; ++i) {
        var x = col + i;
        if (x < DenonDNS3700.MAX_NUM_CHARS) {
            DenonDNS3700.putChar(row, x, str.charCodeAt(i));
        }
    }
}

DenonDNS3700.initDisplayTimerHandler = function()
{
    if (DenonDNS3700.initDisplayCounter % 4 == 0) {
        DenonDNS3700.printLine1("/    Hello,    \\");
        DenonDNS3700.printLine2("\\    Mixxx     /");
        DenonDNS3700.tapLed(DenonDNS3700.LedMode.On);
    } else if (DenonDNS3700.initDisplayCounter % 2 == 0) {
        DenonDNS3700.printLine1("12345678901234");
        DenonDNS3700.printLine2("ABCDEFGHIJKLMN");
        DenonDNS3700.tapLed(DenonDNS3700.LedMode.On);
    } else {
        DenonDNS3700.printLine1("");
        DenonDNS3700.printLine2("");
        DenonDNS3700.tapLed(DenonDNS3700.LedMode.Off);
    }
    
    if (DenonDNS3700.initDisplayCounter == 0) {
        DenonDNS3700.finishInit();
    }
    --DenonDNS3700.initDisplayCounter;
}

DenonDNS3700.enterPlaying = function()
{
    DenonDNS3700.debugStateInfo("Playing");
    DenonDNS3700.playLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.cueLed(DenonDNS3700.LedMode.Off);
    DenonDNS3700.effectsLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.parametersLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Playing;
}

DenonDNS3700.enterPaused = function()
{
    DenonDNS3700.debugStateInfo("Paused");
    DenonDNS3700.playLed(DenonDNS3700.LedMode.Blink);
    DenonDNS3700.cueLed(DenonDNS3700.LedMode.Off);
    DenonDNS3700.effectsLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.parametersLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Paused;
}

DenonDNS3700.enterSearching = function()
{
    DenonDNS3700.debugStateInfo("Searching");
    DenonDNS3700.playLed(DenonDNS3700.LedMode.Off);
    DenonDNS3700.cueLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.effectsLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.parametersLed(DenonDNS3700.LedMode.Blink);
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Paused;   
}

DenonDNS3700.playButtonChanged = function(channel, control, value)
{
    DenonDNS3700.tapLed(DenonDNS3700.LedMode.On);
    if (value == DenonDNS3700.ButtonChange.ButtonPressed) {
        DenonDNS3700.debugKeyInfo("Play Pressed");
        if (DenonDNS3700.playbackState == DenonDNS3700.PlaybackState.Playing) {
            DenonDNS3700.enterPaused();
        } else if (DenonDNS3700.playbackState == DenonDNS3700.PlaybackState.Paused
                   ||                  
                   DenonDNS3700.playbackState == DenonDNS3700.PlaybackState.Searching
                && DenonDNS3700.isTrackLoaded == true) {
            DenonDNS3700.enterPlaying();
        }
    }
}

DenonDNS3700.cueButtonChanged = function(channel, control, value)
{
    if (value == DenonDNS3700.ButtonChange.ButtonPressed) {
        DenonDNS3700.debugKeyInfo("Cue Pressed");

        //if (DenonDNS3700.playbackState == DenonDNS3700.PlaybackState.Playing) {
        DenonDNS3700.enterSearching();
    }
}

DenonDNS3700.setDispState = function(row, state)
{
    if (DenonDNS3700.displayTimer[row] != null) {
        engine.stopTimer(DenonDNS3700.displayTimer[row]);
    }
    DenonDNS3700.displayState[row] = state;
    DenonDNS3700.applyDispState(row, state);
}

DenonDNS3700.pushDispState = function(row, state)
{
    if (DenonDNS3700.displayTimer[row] != null) {
        engine.stopTimer(DenonDNS3700.displayTimer[row]);
    }
    state.prevState = DenonDNS3700.displayState[row];
    DenonDNS3700.displayState[row] = state;
    DenonDNS3700.applyDispState(row, state);
}

DenonDNS3700.applyDispState = function(row, state)
{
    switch(state.displayState) {
    case DenonDNS3700.DisplayState.Empty:
        DenonDNS3700.clearLine(row);
        break;
    case DenonDNS3700.DisplayState.Static:
    case DenonDNS3700.DisplayState.Blink:
        DenonDNS3700.clearLine(row);
        DenonDNS3700.putString(row, state.colStart, state.text);
        break;
    }

    if (state.tickInterval > 0 && state.numTicks > 0) {
        DenonDNS3700.displayTimer[row] = engine.beginTimer(
            state.tickInterval,
            "DenonDNS3700.displayTickHandler" + row);
    }
}

DenonDNS3700.displayTickHandler0 = function()
{
    DenonDNS3700.processDisplayTick(0);
}

DenonDNS3700.displayTickHandler1 = function()
{
    DenonDNS3700.processDisplayTick(1);
}

DenonDNS3700.processDisplayTick = function(row)
{
    var state = DenonDNS3700.displayState[row];
    ++state.currTick;
    
    switch (state.displayState) {
    case DenonDNS3700.DisplayState.Blink:       
        DenonDNS3700.clearLine(row);
        if (state.currTick % 2 == 0) {
           DenonDNS3700.putString(row, state.colStart, state.text);
        }
        break;
    }
    if (state.numTicks > 0 && state.currTick >= state.numTicks) {
        engine.stopTimer(DenonDNS3700.displayTimer[row]);
        var prevState = state.prevState;
        delete DenonDNS3700.displayState[row];
        DenonDNS3700.displayState[row] = prevState;
        if (prevState != null) {
            DenonDNS3700.applyDispState(row, prevState);
        }
    }
}

DenonDNS3700.newEmptyDispState = function(duration)
{
    var obj = {
        displayState : DenonDNS3700.DisplayState.Empty,
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
    DenonDNS3700.setDispState(row, state);
}

DenonDNS3700.newStaticDispState = function(col, text, duration)
{
    var obj = {
        displayState : DenonDNS3700.DisplayState.Static,
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

    if (DenonDNS3700.displayState[row] != null
     && DenonDNS3700.displayState[row].tickInterval > 0
     && DenonDNS3700.displayState[row].numTicks > 0) {
        DenonDNS3700.displayState[row].prevState = newState;
    } else {
        DenonDNS3700.setDispState(row, newState);
    }
}

DenonDNS3700.newBlinkDispState = function(col, text, tickInterval, duration)
{
    var obj = {
        displayState : DenonDNS3700.DisplayState.Blink,
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
    DenonDNS3700.pushDispState(row, state);
}

DenonDNS3700.debugKeyInfo = function(str)
{
    if (DenonDNS3700.DEBUG_LEVEL >= 2) {
        DenonDNS3700.blinkTextDisplay(1, 0, "[ " + str + " ]", 200, 800);
    }
}

DenonDNS3700.debugStateInfo = function(str)
{
    if (DenonDNS3700.DEBUG_LEVEL >= 1) {
        DenonDNS3700.setTextDisplay(1, 0, "mode: " + str);
    }
}


