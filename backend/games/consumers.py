from channels.generic.websocket import AsyncJsonWebsocketConsumer


class GameConsumer(AsyncJsonWebsocketConsumer):
    """One consumer per connected client, subscribed to a single game's
    channel-layer group. run_live_ticker pushes tick payloads into that
    group; this just forwards them to the socket."""

    async def connect(self):
        self.sport = self.scope["url_route"]["kwargs"]["sport"]
        self.game_id = self.scope["url_route"]["kwargs"]["game_id"]
        self.group_name = f"game-{self.sport}-{self.game_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def game_tick(self, event):
        await self.send_json(event["payload"])
