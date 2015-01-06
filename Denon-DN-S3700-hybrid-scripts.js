function DenonDNS3700() {}

DenonDNS3700.initDisplayCounter = 8;

DenonDNS3700.LedMode = {
    On: 0x4A,
    Off: 0x4B,
    Blink: 0x4C
}

DenonDNS3700.CMD_CODE = 0xB0;

DenonDNS3700.MAX_NUM_CHARS = 24;

DenonDNS3700.EMPTY_CHAR = " ".charCodeAt(0);

DenonDNS3700.init = function (id)
{
    this.tapLed(this.LedMode.Blink);

    this.initFlashTimerId
        = engine.beginTimer(500, "DenonDNS3700.initDisplayTimerHandler()");
}

DenonDNS3700.tapLed = function(mode)
{
    midi.sendShortMsg(this.CMD_CODE, mode, 0x09);    
}

DenonDNS3700.printChar = function(idx, ch)
{
    if (idx >= 5) {
        idx++; // quirky offsets...
    }
    var idxMsb = 0x01 + idx;
    var idxLsb = 0x21 + idx;
    
    midi.sendShortMsg(this.CMD_CODE, idxMsb, (ch & 0xF0) >> 4);
    midi.sendShortMsg(this.CMD_CODE, idxLsb, ch & 0x0F);
}

DenonDNS3700.printLine1 = function(str)
{
    var half = this.MAX_NUM_CHARS / 2;
    for (i = 0; i < half; ++i) {
        if (i < str.length) {
            this.printChar(i, str.charCodeAt(i));
        } else {
            this.printChar(i, this.EMPTY_CHAR);
        }
    }
}

DenonDNS3700.printLine2 = function(str)
{
    var half = this.MAX_NUM_CHARS / 2;
    for (i = 0; i < half; ++i) {
        var iAdjusted = i + half;
        if (i < str.length) {
            this.printChar(iAdjusted, str.charCodeAt(i));
        } else {
            this.printChar(iAdjusted, this.EMPTY_CHAR);
        }
    }
}


DenonDNS3700.printString = function(str)
{
    for (i = 0; i < this.MAX_NUM_CHARS; ++i) {
        if (i < str.length) {
            this.printChar(i, str.charCodeAt(i));
        } else {
            this.printChar(i, this.EMPTY_CHAR);
        }
    }
}

DenonDNS3700.initDisplayTimerHandler = function()
{
    if (this.initDisplayCounter % 4 == 0) {
        this.printLine1("/  Hello,  \\");
        this.printLine2("\\  Mixxx   /");
        this.tapLed(this.LedMode.On);
    } else if (this.initDisplayCounter % 2 == 0) {
        this.printString("012345789ABCDEFGHIJKLMNO");
        this.tapLed(this.LedMode.On);
    } else {
        this.printString("");
        this.tapLed(this.LedMode.Off);
    }
    
    if (this.initDisplayCounter == 0) {
        this.tapLed(this.LedMode.Off);
        this.printString("READY :)");
        engine.stopTimer(this.initFlashTimerId);
    }
    --this.initDisplayCounter;
}

