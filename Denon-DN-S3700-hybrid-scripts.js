function DenonDNS3700() {}

DenonDNS3700.m_initDisplayCounter = 8;

DenonDNS3700.LedMode = {
    On: 0x4A,
    Off: 0x4B,
    Blink: 0x4C
}

DenonDNS3700.c_cmdCode = 0xB0;

DenonDNS3700.c_maxNumChars = 24;

DenonDNS3700.c_emptyChar = " ".charCodeAt(0);

DenonDNS3700.init = function (id)
{
    this.tapLed(this.LedMode.On);

    this.printString("Hello, Mixxx");

    this.m_initFlashTimerID
        = engine.beginTimer(500, "DenonDNS3700.initDisplayTimerHandler");
}

DenonDNS3700.tapLed = function(mode)
{
    midi.sendShortMsg(this.c_cmdCode, mode, 0x09);    
}

DenonDNS3700.printChar = function(idx, ch)
{
    if (idx >= 5) {
        idx++; // quirky offsets...
    }
    var idxMsb = 0x01 + idx;
    var idxLsb = 0x21 + idx;
    
    midi.sendShortMsg(this.c_cmdCode, idxMsb, (ch & 0xF0) >> 4);
    midi.sendShortMsg(this.c_cmdCode, idxLsb, ch & 0x0F);
}

DenonDNS3700.printString = function(str)
{
    for (i = 0; i < this.c_maxNumChars; ++i) {
        if (i < str.length) {
            this.printChar(i, str.charCodeAt(i));
        } else {
            this.printChar(i, this.c_emptyChar);
        }
    }
}

DenonDNS3700.initDisplayTimerHandler = function()
{
    this.tapLed(this.LedMode.Blink);
    
    if (this.m_initDisplayCounter == 0) {
        engine.stopTimer(this.m_initDisplayCounter);
    }
    --this.m_initDisplayCounter;    
}

