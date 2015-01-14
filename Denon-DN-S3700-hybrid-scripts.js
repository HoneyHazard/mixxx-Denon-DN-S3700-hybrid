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
    Scrolling : 2,
    Blinking: 3
}

/* TODO: Display States

 per row:
    displayState
    colStart, 
    colEnd, 
    text,
    tickInterval (frequency),
    numTicks, (duration; 0=infinite)
    
    prevState,
    currTick = 0

functions:
    blinkText(row, colStart, colEnd, text, tickInterval, numTicks, bool restore);
    scrollText(row, colStart, colEnd, text, tickInterval, numTicks, bool restore
    staticText(row, colStart, colEnd, text, duration, bool restore);
    emptyText(row, duration);
*/

// TODO: Track navigation; test with both

DenonDNS3700.CMD_CODE = 0xB0;
DenonDNS3700.MAX_NUM_CHARS = 16;
DenonDNS3700.EMPTY_CHAR = " ".charCodeAt(0);

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

DenonDNS3700.init = function (id)
{
    // Does not work in hybrid mode :(
    // Is there a way to start up in a known platter state?

    //DenonDNS3700.printLine1("12345678901234567890");
    //DenonDNS3700.printLine1("test");
    //DenonDNS3700.tapLed(DenonDNS3700.LedMode.On);
    //DenonDNS3700.putChar(1, 3, "_".charCodeAt(0));

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
    DenonDNS3700.printLine2("READY :)");
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
    for (i = 0; i < DenonDNS3700.MAX_NUM_CHARS; ++i) {
        if (i < str.length) {
            DenonDNS3700.putChar(0, i, str.charCodeAt(i));
        } else {
            DenonDNS3700.putChar(0, i, DenonDNS3700.EMPTY_CHAR);
        }
    }
}

DenonDNS3700.printLine2 = function(str)
{
    for (i = 0; i < DenonDNS3700.MAX_NUM_CHARS; ++i) {
        if (i < str.length) {
            DenonDNS3700.putChar(1, i, str.charCodeAt(i));
        } else {
            DenonDNS3700.putChar(1, i, DenonDNS3700.EMPTY_CHAR);
        }
    }
}

DenonDNS3700.initDisplayTimerHandler = function()
{
    if (DenonDNS3700.initDisplayCounter % 4 == 0) {
        DenonDNS3700.printLine1("/  Hello,  \\");
        DenonDNS3700.printLine2("\\  Mixxx   /");
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
    DenonDNS3700.printLine1("plbk: Playing");
    DenonDNS3700.playLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.cueLed(DenonDNS3700.LedMode.Off);
    DenonDNS3700.effectsLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.parametersLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Playing;
}

DenonDNS3700.enterPaused = function()
{
    DenonDNS3700.printLine1("plbk: Paused");
    DenonDNS3700.playLed(DenonDNS3700.LedMode.Blink);
    DenonDNS3700.cueLed(DenonDNS3700.LedMode.Off);
    DenonDNS3700.effectsLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.parametersLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Paused;
}

DenonDNS3700.enterSearching = function()
{
    DenonDNS3700.printLine1("plbk: Searching");
    DenonDNS3700.playLed(DenonDNS3700.LedMode.Off);
    DenonDNS3700.cueLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.effectsLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.parametersLed(DenonDNS3700.LedMode.Blink);
    DenonDNS3700.playbackState = DenonDNS3700.PlaybackState.Paused;   
}

DenonDNS3700.playButtonChanged = function(channel, control, value)
{
    DenonDNS3700.printLine2("db: Play Pressed");
    if (value == DenonDNS3700.ButtonChange.ButtonPressed) {
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
    DenonDNS3700.printLine2("db: Cue Pressed");
    if (value == DenonDNS3700.ButtonChange.ButtonPressed) {
        //if (DenonDNS3700.playbackState == DenonDNS3700.PlaybackState.Playing) {
        DenonDNS3700.enterSearching();
    }
}
