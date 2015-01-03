function DenonDNS3700() {}

DenonDNS3700.initDisplayCounter = 8;

DenonDNS3700.LedEnum = {
    On: 0x4A,
    Off: 0x4B,
    Blink: 0x4C
}

DenonDNS3700.init = function (id)
{
    // blink TAP button
    this.tapLed(this.LedEnum.Blink);
    
    AmericanAudioDV2.initFlashTimerID
        = engine.beginTimer(500, "DenonDNS3700.initFlashTimerHandler");
}

DenonDNS3700.tapLed = function(mode)
{
    midi.sendShortMsg(0xB0, mode, 0x09);    
}

DenonDNS3700.initFlashTimerHandler = function()
{
    if (DenonDNS3700.initFlashCounter % 2 == 0) {
        // TODO something
    }
}

