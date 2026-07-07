import{a7 as o,a8 as s,a9 as r,aa as i,ab as m}from"./index-BYafCTly.js";/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */const d=()=>{const e=window;e.addEventListener("statusTap",()=>{o(()=>{const a=document.elementFromPoint(e.innerWidth/2,e.innerHeight/2);if(!a)return;const t=s(a);t&&new Promise(n=>r(t,n)).then(()=>{i(async()=>{t.style.setProperty("--overflow","hidden"),await m(t,300),t.style.removeProperty("--overflow")})})})})};export{d as startStatusTap};
