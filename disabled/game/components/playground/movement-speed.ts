export function movementSpeed(moving:boolean,sprinting:boolean,driving=false,walkSpeed=1.9){
 if(!moving)return 0;
 return driving?(sprinting?8.5:5):walkSpeed*(sprinting?1.8:1);
}
