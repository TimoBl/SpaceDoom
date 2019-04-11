var bc
var bctx
var c
var ctx
var sc
var sctx

var limit
var zone
var asteroids
var healths
var meta_players
var game_started = false
var shift_inp = 1

var dx
var dy

var socket = io()

var game_name

$(window).resize(function() {
	size_canvas()
	draw_background(bc, bctx, dx, dy, background_image)
})

socket.on('disconnect', function() {
	var text = "Reload page..."
	$("body").html(text)
})

socket.on('init_view', function(x, y) {
	size_canvas()
	dx = parseInt(c.width / 2) - x
	dy = parseInt(c.height / 2) - y
	draw_background(bc, bctx, dx, dy, background_image)
	load_image_assets()
})

socket.on('start_game', function() {
	init_inputs()
	game_started = true
})

socket.on('change_html', function(text) {
	$("#html_content").html(text)
})

socket.on('update', function(players, bullets) {
	update(players, bullets)
})

socket.on('meta_update', function(limits, zones, asteroid, health, players) {
	limit = limits
	zone = zones
	asteroids = asteroid
	healths = health
	meta_players = players
	display_player_rank(meta_players)
})

function size_canvas() {
	bc = $("#backCanvas")[0]
	bc.width = window.innerWidth
	bc.height = window.innerHeight
	bctx = bc.getContext('2d')

	c = $("#myCanvas")[0]
	c.width = window.innerWidth
	c.height = window.innerHeight
	ctx = c.getContext('2d')

	sc = $("#shaderCanvas")[0]
	sc.width = window.innerWidth
	sc.height = window.innerHeight
	sctx = sc.getContext('2d')
}

function update(players, bullets) {
	if (game_started === true) {

		border = 100

		bctx.clearRect(0, 0, c.width, c.height)
		ctx.clearRect(0, 0, c.width, c.height)
		sctx.clearRect(0, 0, c.width, c.height)

		var player = players.find(x => x.id === socket.id)
		var meta_player = meta_players.find(x => x.id === socket.id)

		draw_background(bc, bctx, dx, dy, background_image)

		if (player != null) {
			dx = parseInt(c.width / 2) - player.x
			dy = parseInt(c.height / 2) - player.y
			draw_borders(bctx, meta_player.state, dx, dy)
			draw_mini_map(sctx, players, meta_players, asteroids, player.x, player.y)
		}

		draw_bullets(c, ctx, dx, dy, bullets)
		draw_healths(c, ctx, dx, dy, healths)
		draw_asteroids(ctx, dx, dy, asteroids)


		for (var i = 0; i < players.length; i++) {
			var x = dx + players[i].x
			var y = dy + players[i].y
			if (x >= -border && x <= c.width + border && y >= -border && y <= c.width + border) {
				draw_player(ctx, x, y, meta_players[i].r, players[i].rot, meta_players[i].asset_index)
				draw_shield(ctx, x, y, meta_players[i].r, players[i].health / 100)
				if (players[i].input_t > 0) {
					draw_thrust(ctx, x, y, meta_players[i].r, players[i].rot, players[i].input_t)
				}
				show_player_info(sctx, meta_players[i], x, y)
			}
		}
	}
}