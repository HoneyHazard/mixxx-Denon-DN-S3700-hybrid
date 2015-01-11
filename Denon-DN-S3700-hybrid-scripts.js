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

DenonDNS3700.MainState = {
    Initializing : 0,
    FileNavigation : 1,
    TrackNavigation : 2,
    Paused : 3,
    Playing : 4,
}

DenonDNS3700.CMD_CODE = 0xB0;
DenonDNS3700.MAX_NUM_CHARS = 24;
DenonDNS3700.EMPTY_CHAR = " ".charCodeAt(0);

DenonDNS3700.initDisplayCounter = 8;
DenonDNS3700.mainState = DenonDNS3700.MainState.Initializing;

DenonDNS3700.init = function (id)
{
    DenonDNS3700.turnTableOff();

    
    DenonDNS3700.tapLed(DenonDNS3700.LedMode.Blink);
    DenonDNS3700.playLed(DenonDNS3700.LedMode.Off);

    DenonDNS3700.initFlashTimerId
        = engine.beginTimer(500, "DenonDNS3700.initDisplayTimerHandler()");
}

DenonDNS3700.turnTableOn = function()
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, 0x66, 0x7F);
}

DenonDNS3700.turnTableOff = function()
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, 0x66, 0x00);
}

DenonDNS3700.playLed = function(mode)
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, mode, 0x27);
}

DenonDNS3700.tapLed = function(mode)
{
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, mode, 0x09);    
}

DenonDNS3700.printChar = function(idx, ch)
{
    if (idx >= 5) {
        idx++; // quirky offsets...
    }
    var idxMsb = 0x01 + idx;
    var idxLsb = 0x21 + idx;
    
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, idxMsb, (ch & 0xF0) >> 4);
    midi.sendShortMsg(DenonDNS3700.CMD_CODE, idxLsb, ch & 0x0F);
}

DenonDNS3700.printLine1 = function(str)
{
    var half = DenonDNS3700.MAX_NUM_CHARS / 2;
    for (i = 0; i < half; ++i) {
        if (i < str.length) {
            DenonDNS3700.printChar(i, str.charCodeAt(i));
        } else {
            DenonDNS3700.printChar(i, DenonDNS3700.EMPTY_CHAR);
        }
    }
}

DenonDNS3700.printLine2 = function(str)
{
    var half = DenonDNS3700.MAX_NUM_CHARS / 2;
    for (i = 0; i < half; ++i) {
        var iAdjusted = i + half;
        if (i < str.length) {
            DenonDNS3700.printChar(iAdjusted, str.charCodeAt(i));
        } else {
            DenonDNS3700.printChar(iAdjusted, DenonDNS3700.EMPTY_CHAR);
        }
    }
}


DenonDNS3700.printString = function(str)
{
    for (i = 0; i < DenonDNS3700.MAX_NUM_CHARS; ++i) {
        if (i < str.length) {
            DenonDNS3700.printChar(i, str.charCodeAt(i));
        } else {
            DenonDNS3700.printChar(i, DenonDNS3700.EMPTY_CHAR);
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
        DenonDNS3700.printString("012345789ABCDEFGHIJKLMNO");
        DenonDNS3700.tapLed(DenonDNS3700.LedMode.On);
    } else {
        DenonDNS3700.printString("");
        DenonDNS3700.tapLed(DenonDNS3700.LedMode.Off);
    }
    
    if (DenonDNS3700.initDisplayCounter == 0) {
        DenonDNS3700.tapLed(DenonDNS3700.LedMode.Off);
        engine.stopTimer(DenonDNS3700.initFlashTimerId);
        DenonDNS3700.printLine2("READY :)");
        DenonDNS3700.enterPaused();
    }
    --DenonDNS3700.initDisplayCounter;
}

DenonDNS3700.enterPlaying = function()
{
    DenonDNS3700.printLine1("Playing");
    DenonDNS3700.playLed(DenonDNS3700.LedMode.On);
    DenonDNS3700.mainState = DenonDNS3700.MainState.Playing;
}

DenonDNS3700.enterPaused = function()
{
    DenonDNS3700.printLine1("Paused");
    DenonDNS3700.playLed(DenonDNS3700.LedMode.Blink);
    DenonDNS3700.mainState = DenonDNS3700.MainState.Paused;
}

DenonDNS3700.playPressed = function(channel, control, value)
{
    DenonDNS3700.printLine2("Play Pressed");
    if (value == DenonDNS3700.ButtonChange.ButtonPressed) {
        if (DenonDNS3700.mainState == DenonDNS3700.MainState.Playing) {
            DenonDNS3700.enterPaused();
        } else if (DenonDNS3700.mainState == DenonDNS3700.MainState.Paused) {
            DenonDNS3700.enterPlaying();
        }
    }
}
