var bc;
var bctx;
var c;
var ctx;
var sc;
var sctx;

var limit;
var asteroids;
var game_started = false;
var shift_inp = 1;

var socket = io();

var game_name;

socket.on('disconnect', function() {
  var text = "Reload page..."
  $("body").html(text)
});

var background_image = new Image()
background_image.src = "static/Background.png"

socket.on('init_view', function(limits, x, y){
  limit = limits
  size_canvas()
  $(window).resize(function(){size_canvas()})
  var dx = parseInt(c.width / 2) - x
  var dy = parseInt(c.height / 2) - y
  draw_background(bc, bctx, dx, dy, background_image)
})

socket.on('start_game', function(asteroid) {
  asteroids = asteroid
  init_inputs()
  game_started = true
})

socket.on('change_html', function(text){
  $("#html_content").html(text)
})

socket.on('update_stats', function(players){
  display_player_rank(players)
})

socket.on('update', function(players, bullets) {
  update(players, bullets)
})

function size_canvas(){
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

function update(players, bullets){
  if (game_started === true){

    bctx.clearRect(0, 0, c.width, c.height)
    ctx.clearRect(0, 0, c.width, c.height)
    sctx.clearRect(0, 0, c.width, c.height)

    var player = players.find(x => x.id === socket.id)

    var dx = parseInt(c.width / 2) - player.x
    var dy = parseInt(c.height / 2) - player.y

    border = 100

    draw_background(bc, bctx, dx, dy, background_image)
    draw_bullets(c, ctx, dx, dy, bullets)
    draw_asteroids(ctx, dx, dy, asteroids)

    for (var i = 0; i < players.length; i++){
      var x = dx + players[i].x
      var y = dy + players[i].y
      if (x >= -border && x <= c.width + border && y >= -border && y <= c.width + border){
        draw(ctx, x, y, players[i].r, players[i].rot, players[i].color)
        draw_shield(ctx, x, y, players[i].r, players[i].health/100)
        if (players[i].input_t > 0){
          draw_thrust(ctx, x, y, players[i].r, players[i].rot, players[i].input_t)
        }
        show_player_info(sctx, players[i], x, y)
      }
    }

    draw_mini_map(sctx, players, asteroids, player.x, player.y)
  }
  display_player_rank(players)
}