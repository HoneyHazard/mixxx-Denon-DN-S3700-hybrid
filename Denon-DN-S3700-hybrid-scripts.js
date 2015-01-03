function DenonDNS3700() {}

DenonDNS3700.initDisplayCounter = 8;

DenonDNS3700.LedEnum = {
    On: 0x4A,
    Off: 0x4B,
    Blink: 0x4C
}

DenonDNS3700.cmdCode = 0xB0;

DenonDNS3700.init = function (id)
{
    // blink TAP button
    this.tapLed(this.LedEnum.On);

    this.printChar(0, "0".charCodeAt(0));
    this.printChar(1, "1".charCodeAt(0));
    this.printChar(2, "2".charCodeAt(0));
    this.printChar(3, "3".charCodeAt(0));

    this.printChar(4, "4".charCodeAt(0));
    this.printChar(5, "5".charCodeAt(0));
    this.printChar(6, "6".charCodeAt(0));
    this.printChar(7, "7".charCodeAt(0));

    this.printChar(8, "8".charCodeAt(0));
    this.printChar(9, "9".charCodeAt(0));
    this.printChar(10, "A".charCodeAt(0));
    this.printChar(11, "B".charCodeAt(0));

    this.printChar(12, "C".charCodeAt(0));
    this.printChar(13, "D".charCodeAt(0));
    this.printChar(14, "E".charCodeAt(0));
    this.printChar(15, "F".charCodeAt(0));

    this.printChar(16, "0".charCodeAt(0));
    this.printChar(17, "1".charCodeAt(0));
    this.printChar(18, "2".charCodeAt(0));
    this.printChar(19, "3".charCodeAt(0));
    
    this.printChar(20, "4".charCodeAt(0));
    this.printChar(21, "5".charCodeAt(0));
    this.printChar(22, "6".charCodeAt(0));
    this.printChar(23, "7".charCodeAt(0));

    AmericanAudioDV2.initFlashTimerID
        = engine.beginTimer(500, "DenonDNS3700.initFlashTimerHandler");
}

DenonDNS3700.tapLed = function(mode)
{
    midi.sendShortMsg(this.cmdCode, mode, 0x09);    
}

DenonDNS3700.printChar = function(idx, ch)
{
    if (idx >= 5) {
        idx++; // quirky offsets...
    }
    var idxMsb = 0x01 + idx;
    var idxLsb = 0x21 + idx;
    
    midi.sendShortMsg(this.cmdCode, idxMsb, (ch & 0xF0) >> 4);
    midi.sendShortMsg(this.cmdCode, idxLsb, ch & 0x0F);
}

DenonDNS3700.initFlashTimerHandler = function()
{
    if (DenonDNS3700.initFlashCounter % 2 == 0) {
        // TODO something
    }
}

