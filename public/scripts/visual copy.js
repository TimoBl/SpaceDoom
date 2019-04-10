if (this.x - meta.r < zone.x0){
  this.vx = -this.vx * bounciness
  this.x = meta.r + zone.x0 + 1
}
if (this.y - meta.r < zone.y0){
  this.vy = -this.vy * bounciness
  this.y = meta.r + zone.y0 + 1
}

if (this.x + meta.r > zone.x1){
  this.vx = -this.vx * bounciness
  this.x = -meta.r + zone.x1 - 1
}
if (this.y + meta.r > zone.y1){
  this.vy = -this.vy * bounciness
  this.y = -meta.r + zone.y1 - 1
}