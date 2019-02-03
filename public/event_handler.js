function init_inputs(){
  document.addEventListener('keydown', function(event) {
    if (event.keyCode == "65"){socket.emit('change_rotation_input', -1 * shift_inp)} //a
    if (event.keyCode == "37"){socket.emit('change_rotation_input', -1 * shift_inp)} //arrow left

    if (event.keyCode == "68"){socket.emit('change_rotation_input', 1 * shift_inp)} //d
    if (event.keyCode == "39"){socket.emit('change_rotation_input', 1 * shift_inp)} //arrow right
    
    if (event.keyCode == "87"){socket.emit('change_y_input', 1)} //w
    if (event.keyCode == "38"){socket.emit('change_y_input', 1)} //arrow up

    if (event.keyCode == "32"){socket.emit('shoot')} //shoot

    if (event.keyCode == "16"){shift_inp = 0.25}
  }, false)

  document.addEventListener('keyup', function(event) {
    if (event.keyCode == "65"){socket.emit('change_rotation_input', 0)} //a
    if (event.keyCode == "37"){socket.emit('change_rotation_input', 0)} //arrow left

    if (event.keyCode == "68"){socket.emit('change_rotation_input', 0)} //d
    if (event.keyCode == "39"){socket.emit('change_rotation_input', 0)} //arrow right
    
    if (event.keyCode == "87"){socket.emit('change_y_input', 0)} //w
    if (event.keyCode == "38"){socket.emit('change_y_input', 0)} //arrow up

    if (event.keyCode == "16"){shift_inp = 1}
  }, false);

  window.addEventListener ("touchmove", function (event) {
    event.preventDefault ();
    event.stopPropagation();
  }, {passive: false});
}