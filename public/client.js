var bc = $("#backCanvas")[0]
bc.width = window.innerWidth
bc.height = window.innerHeight
var bctx = bc.getContext('2d')

var c = $("#myCanvas")[0]
c.width = window.innerWidth
c.height = window.innerHeight
var ctx = c.getContext('2d')

var sc = $("#shaderCanvas")[0]
sc.width = window.innerWidth
sc.height = window.innerHeight
var sctx = sc.getContext('2d')

var bound;
var asteroids;
var game_started = false;
var shift_inp = 1;
var trail = []

var background_image = new Image()
background_image.src = "static/Background.png"

socket.on('init_view', function(bounds, x, y){
  bound = bounds
  var dx = parseInt(c.width / 2) - x
  var dy = parseInt(c.height / 2) - y
  draw_background(bctx, dx, dy, background_image)
})

socket.on('start_game', function(asteroid) {
  asteroids = asteroid
  game_started = true
  init_inputs()
  $("#title_container")[0].style.display = "none"
})

socket.on('disconnect', function() {
  var text = "Reload page..."
  $("body").html(text)
});

socket.on('update_stats', function(players){
  console.log("update")
  display_player_rank(players)
})

socket.on('update', function(players, bullets) {
  update(players, bullets)
})

function update(players, bullets){
  if (game_started === true){

    bctx.clearRect(0, 0, c.width, c.height)
    ctx.clearRect(0, 0, c.width, c.height)
    sctx.clearRect(0, 0, c.width, c.height)

    var player = players.filter(obj => {
      return obj.id === socket.id
    })

    player = player[0]

    var dx = parseInt(c.width / 2) - player.x
    var dy = parseInt(c.height / 2) - player.y

    border = 100

    draw_background(bctx, dx, dy, background_image)
    draw_bullets(ctx, dx, dy, bullets)
    draw_asteroids(ctx, dx, dy, asteroids)

    for (var i = 0; i < players.length; i++){
      var x = dx + players[i].x
      var y = dy + players[i].y
      if (x >= -border && x <= c.width + border && y >= -border && y <= c.width + border){
        draw(ctx, x, y, players[i].r, players[i].rot, players[i].color)
        show_player_info(sctx, players[i], x, y)
        if (players[i].input_t !== 0){
          draw_thrust(ctx, x, y, players[i].r, players[i].rot)
        }

        draw_light(sctx, x, y, players[i].r, players[i].rot)
        draw_shield(ctx, x, y, players[i].r, players[i].health/100)
      }
    }
  }
  draw_mini_map(sctx, players, asteroids, player.x, player.y)
  display_player_rank(players)
}