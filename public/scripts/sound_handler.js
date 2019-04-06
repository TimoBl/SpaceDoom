var shoot_sound;
var explosion_sound;

var audioCtx
const AudioContext = window.AudioContext || window.webkitAudioContext;


function init_sounds(){
	audioCtx = new AudioContext()

	shoot_sound = new Audio("static/sounds/Laser6.mp3")
	shoot_sound.crossorigin = "anonymous"

	explosion_sound = new Audio("static/sounds/Explosion_3.mp3")
	explosion_sound.crossorigin = "anonymous"
}


socket.on('play_shoot_sound', function() {
  //shoot_sound.play()
})

socket.on('play_explosion_sound', function() {
  //explosion_sound.play()
})