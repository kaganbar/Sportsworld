// Shared Redis pub/sub channel names, kept in one place so producers
// (NormalizeService, SimulatedTickerService) and the consumer (LiveGateway)
// can't drift apart on the string.
export const GAME_TICKS_CHANNEL = 'game-ticks';
