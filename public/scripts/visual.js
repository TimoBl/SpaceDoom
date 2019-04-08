var asteroid_images
var player_images
var health_image
var background_image = new Image()
background_image.src = "static/images/background.png"

function load_image_assets(){
  health_image = new Image()
  health_image.src = "static/images/health.png"
  var asteroid_image_1 = new Image()
  asteroid_image_1.src = "static/images/asteroid1.png"
  var asteroid_image_2 = new Image()
  asteroid_image_2.src = "static/images/asteroid2.png"
  
  asteroid_images = [asteroid_image_1, asteroid_image_2]


  var player_image1 = new Image()
  player_image1.src = "static/images/BlueShip.png"

  var player_image2 = new Image()
  player_image2.src = "static/images/OrangeShip.png"

  var player_image3 = new Image()
  player_image3.src = "static/images/RedShip.png"

  var player_image4 = new Image()
  player_image4.src = "static/images/GreenShip.png"

  player_images = [player_image1, player_image2, player_image3, player_image4]
}

function draw_background(c, canvas, dx, dy, img){
  canvas.fillRect(0, 0, c.width, c.height);
  canvas.drawImage(img, dx, dy, 6 * img.width, 6 * img.height);
}

function draw_bullets(c, canvas, dx, dy, bullets){
  canvas.globalAlpha = 1.0
  canvas.fillStyle = "#f24324"
  for (var i = 0; i < bullets.length; i++){
    var x = dx + bullets[i].x
    var y = dy + bullets[i].y
    if (x >= 0 && x <= c.width && y >= 0 && y <= c.width){
      canvas.globalAlpha = 5 / bullets[i].r
      canvas.beginPath();
      canvas.arc(x, y, bullets[i].r, 0, 2 * Math.PI);
      canvas.lineWidth = 0;
      canvas.fill()
    }
  }
}

function draw_healths(c, canvas, dx, dy, healths){
  canvas.globalAlpha = 1.0
  canvas.fillStyle = "#00ffff"
  for (var i = 0; i < healths.length; i++){
    var x = dx + healths[i].x
    var y = dy + healths[i].y
    if (x >= 0 && x <= c.width && y >= 0 && y <= c.width){
      ctx.drawImage(health_image, x, y, healths[i].r, healths[i].r)
    }
  }
}

function draw_player(context, x, y, r, rot, index){
  context.globalAlpha = 1.0
  context.save()
  context.translate(x, y)
  context.rotate(rot)
  context.drawImage(player_images[index], - r + 5, - r + 5, (2 * r) - 10, (2 * r) - 10)
  context.restore()
}

function draw (canvas, x, y, r, rot, color){
  canvas.globalAlpha = 1.0
  canvas.fillStyle = color
  canvas.strokeStyle = color
  var path = [[0, 10], [r/2, r/2], [0, -2 * r / 3], [-r/2, r/2], [0, 10]]
  canvas.moveTo(x, y)
  canvas.beginPath() 
  for (var i = 0; i < path.length; i++){
    var x1 = x + parseInt(Math.cos(rot + Math.PI / 2) * path[i][0] - Math.sin(rot + Math.PI / 2) * path[i][1])
    var y1 = y + parseInt(Math.sin(rot + Math.PI / 2) * path[i][0] + Math.cos(rot + Math.PI / 2) * path[i][1])
    canvas.lineTo(x1, y1)
  }
  canvas.fill()
}

function draw_shield(canvas, x, y, r, a){
  canvas.fillStyle = "#6100ff"
  canvas.globalAlpha = a / 6
  canvas.beginPath()
  canvas.arc(x, y, r, 0, 2*Math.PI)
  canvas.fill()

  canvas.strokeStyle = "#6100ff"
  canvas.globalAlpha = a / 2
  canvas.lineWidth = 3
  canvas.beginPath()
  canvas.arc(x, y, r, 0, 2*Math.PI)
  canvas.stroke()
}

function draw_asteroids(canvas, dx, dy, asteroids){
  canvas.globalAlpha = 1.0
  canvas.fillStyle = "#4f2600"
  canvas.strokeStyle = "#4f2600"

  for (var i = 0; i < asteroids.length; i++){
    var r = asteroids[i].r
    var n = asteroids[i].asset_index
    canvas.drawImage(asteroid_images[n], dx + asteroids[i].x - r, dy + asteroids[i].y - r, 2*r, 2*r)
  }
}

function draw_borders(canvas, dx, dy){
  canvas.lineWidth = 3
  canvas.strokeStyle = "grey";
  canvas.beginPath();
  canvas.setLineDash([60, 60]);
  canvas.moveTo(limit.x0 + dx, limit.y0 + dy);
  canvas.lineTo(limit.x1 + dx, limit.y0 + dy);
  canvas.lineTo(limit.x1 + dx, limit.y1 + dy);
  canvas.lineTo(limit.x0 + dx, limit.y1 + dy);
  canvas.lineTo(limit.x0 + dx, limit.y0 + dy);
  canvas.stroke();
}

function draw_mini_map(canvas, players, meta_players, asteroids, x, y){
  var w = parseInt(window.innerHeight / 15 + window.innerWidth / 30)
  
  border = 20
  canvas.globalAlpha = 1.0
  canvas.strokeStyle = "rgba(0, 175, 35, 0.6)"
  canvas.fillStyle = "rgba(14, 122, 38, 0.2)"
  canvas.lineWidth = 2.0

  canvas.beginPath();
  canvas.arc(w + border, w + border, w, 0, 2 * Math.PI);
  canvas.fill();

  for (var i = 1; i <= 3; i++){
    var r = i * w / 3

    canvas.beginPath();
    canvas.arc(w + border, w + border, r, 0, 2 * Math.PI);
    canvas.stroke();
  }

  for (var i = 0; i < players.length; i++){
    var x1 = (players[i].x - x) / 10
    var y1 = (players[i].y - y) / 10

    var d = Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2))
    
    if (d > w){
      nx1 = x1 * w / d 
      ny1 = y1 * w / d

      x1 = nx1
      y1 = ny1
    }

    canvas.fillStyle = meta_players[i].color
    canvas.beginPath();
    canvas.arc(x1 + w + border, y1 + w + border, meta_players[i].r / 10, 0, 2 * Math.PI);
    canvas.fill();
  }


  canvas.fillStyle = "#4f2600"
  for (var i = 0; i < asteroids.length; i++){
    var x1 = (asteroids[i].x - x) / 10
    var y1 = (asteroids[i].y - y) / 10

    var d = Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2))
    
    if (d <= w){
      canvas.beginPath();
      canvas.arc(x1 + w + border, y1 + w + border, asteroids[i].r / 20, 0, 2 * Math.PI);
      canvas.fill();
    }
  }
}

function draw_thrust(canvas, x, y, r, rot, input_t){
  canvas.globalAlpha = 1.0
  var grad = canvas.createRadialGradient(x,y,0,x,y,1.5*r)
  
  grad.addColorStop(0.002, 'rgba(255, 0, 0, 1.000)');
  grad.addColorStop(0.645, 'rgba(255, 127, 0, 0.6)');
  grad.addColorStop(1.000, 'rgba(255, 246, 0, 0.2)');

  canvas.fillStyle = grad
  canvas.beginPath() 
  var path = [[0, 0.5*r*input_t + r], [-r/4, r/2], [r/4, r/2]]
  for (var i = 0; i < path.length; i++){
    var x1 = x + parseInt(Math.cos(rot + Math.PI / 2) * path[i][0] - Math.sin(rot + Math.PI / 2) * path[i][1])
    var y1 = y + parseInt(Math.sin(rot + Math.PI / 2) * path[i][0] + Math.cos(rot + Math.PI / 2) * path[i][1])
    canvas.lineTo(x1, y1)
  }
  canvas.fill()
}

function show_player_info(canvas, meta, x, y){
  r = meta.r

  canvas.strokeStyle = "grey";
  canvas.lineWidth = 2;
  canvas.beginPath();
  canvas.moveTo(x + 0.525 * 1.5 * r, y - 0.525 * 1.5 * r);
  canvas.lineTo(x + r, y - r);
  canvas.lineTo(x + 2.5 * r, y - r);
  canvas.stroke();

  canvas.globalAlpha = 1.0
  canvas.textAlign = 'right'
  canvas.font = "15px Arial"
  canvas.fillStyle = meta.color
  canvas.fillText(meta.name, x + 2.5 * r, y - r - 2);
}

function draw_light(canvas, x, y, r, rot){
  var grad = canvas.createRadialGradient(x,y,0,x,y,r*6)
  grad.addColorStop(0.0, 'rgba(255, 255, 0, 0.75)');
  grad.addColorStop(1.0, 'rgba(255, 255, 0, 0)');

  canvas.fillStyle = grad
  canvas.globalAlpha = 1.0
  canvas.beginPath()
  var path = [[0, - 3 * r / 4], [-2 * r, -8 * r], [2 * r, -6 * r]]
  for (var i = 0; i < path.length; i++){
    var x1 = x + parseInt(Math.cos(rot + Math.PI / 2) * path[i][0] - Math.sin(rot + Math.PI / 2) * path[i][1])
    var y1 = y + parseInt(Math.sin(rot + Math.PI / 2) * path[i][0] + Math.cos(rot + Math.PI / 2) * path[i][1])
    canvas.lineTo(x1, y1)
  }
  canvas.fill()
}

function display_player_rank(players){
  var text = "<table><tr><th>Player</th><th>Kills</th><th>Killed</th></tr>"
  for (var i = 0; i < players.length; i++){
    text += "<tr><td style='color: " + players[i].color + "'>" + players[i].name + "</td><td>" + players[i].kills.toString() + "</td><td>" + players[i].killed.toString() + "</td><tr>"
  }
  text += "</table>"
  $("#player_list").html(text)
}