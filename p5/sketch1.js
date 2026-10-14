let str = "randomArt可视化创意编程";
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB,360,100,100,100);
}
function draw() {
  background(0,0,0,5);
  fill(random(360),100,random(100),100);
  let n = floor(random(str.length));
  let str_trim = str.charAt((str.length-1)-frameCount%str.length);
  textSize(frameCount*10%250);
  textAlign(CENTER,CENTER);
text(str_trim,random(width),random(height));
}