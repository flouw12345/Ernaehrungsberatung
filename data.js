"use strict";
/* ---------- Plan-Lebensmittel (Nährwerte je 100 g, fi = Ballaststoffe) ---------- */
const FOODS={
 chicken:{n:"Hähnchenbrust",cn:"鸡胸肉",k:110,p:23,c:0,f:1.5,cat:"prot",tags:["meat"],pack:{g:1000,l:"1 kg"}},
 beef:{n:"Rinderhack mager (5 %)",cn:"瘦牛肉末",k:121,p:21,c:0,f:5,cat:"prot",tags:["meat"],pack:{g:500,l:"500 g"}},
 salmon:{n:"Lachsfilet",cn:"三文鱼",k:200,p:20,c:0,f:13,cat:"prot",tags:["fish"],pack:{g:250,l:"250 g"}},
 tuna:{n:"Thunfisch in Wasser, abgetropft",cn:"水浸金枪鱼罐头",k:110,p:25,c:0,f:1,cat:"prot",tags:["fish"],pack:{g:130,l:"Dose"}},
 shrimp:{n:"Garnelen",cn:"虾仁",k:85,p:18,c:0,f:1,cat:"prot",tags:["fish"],pack:{g:400,l:"400 g TK"}},
 tofu:{n:"Tofu natur, fest",cn:"老豆腐",k:120,p:13,c:2,f:7,fi:1,cat:"prot",tags:["soy"],pack:{g:400,l:"400 g"}},
 egg:{n:"Eier",cn:"鸡蛋",k:145,p:12.5,c:0.7,f:10,cat:"prot",tags:["egg"],unit:{g:60,l:"Stück"},pack:{g:600,l:"10er"}},
 eggwhite:{n:"Eiklar",cn:"蛋清",k:48,p:11,c:0.7,f:0.2,cat:"prot",tags:["egg"],pack:{g:500,l:"500 g"}},
 quark:{n:"Magerquark",cn:"脱脂夸克",k:67,p:12,c:4,f:0.3,cat:"dairy",tags:["dairy"],reg:["de"],pack:{g:500,l:"500 g"}},
 skyr:{n:"Skyr natur",cn:"冰岛酸奶",k:63,p:11,c:4,f:0.2,cat:"dairy",tags:["dairy"],pack:{g:450,l:"450 g"}},
 greek:{n:"Griechischer Joghurt 0 %",cn:"希腊酸奶（无脂）",k:57,p:10,c:4,f:0.2,cat:"dairy",tags:["dairy"],pack:{g:500,l:"500 g"}},
 cottage:{n:"Körniger Frischkäse",cn:"茅屋奶酪",k:98,p:13,c:3,f:4,cat:"dairy",tags:["dairy"],pack:{g:200,l:"200 g"}},
 soyyog:{n:"Soja-Skyr-Alternative",cn:"高蛋白豆乳酸奶",k:70,p:10,c:3,f:2,fi:0.5,cat:"dairy",tags:["soy"],pack:{g:400,l:"400 g"}},
 milk:{n:"Milch 1,5 %",cn:"低脂牛奶",k:47,p:3.4,c:4.9,f:1.5,cat:"dairy",tags:["dairy"],pack:{g:1000,l:"1 l"}},
 soymilk:{n:"Sojadrink ungesüßt",cn:"无糖豆浆",k:33,p:3.3,c:0.5,f:1.8,fi:0.5,cat:"dairy",tags:["soy"],pack:{g:1000,l:"1 l"}},
 whey:{n:"Whey-Proteinpulver",cn:"乳清蛋白粉",k:380,p:75,c:8,f:5,cat:"misc",tags:["dairy"],scoop:30,pack:{g:1000,l:"1-kg-Dose"},long:true},
 soyprot:{n:"Sojaprotein-Pulver",cn:"大豆蛋白粉",k:370,p:85,c:3,f:2,fi:1,cat:"misc",tags:["soy"],scoop:30,pack:{g:1000,l:"1-kg-Dose"},long:true},
 oats:{n:"Haferflocken",cn:"燕麦片",k:370,p:13.5,c:59,f:7,fi:10,cat:"carb",tags:["gluten"],pack:{g:500,l:"500 g"}},
 rice:{n:"Reis, roh",cn:"大米",k:350,p:7,c:78,f:0.6,fi:1.4,cat:"carb",pack:{g:1000,l:"1 kg"}},
 pasta:{n:"Vollkornnudeln, roh",cn:"全麦意面",k:350,p:13,c:64,f:2.5,fi:8,cat:"carb",tags:["gluten"],pack:{g:500,l:"500 g"}},
 potato:{n:"Kartoffeln",cn:"土豆",k:75,p:2,c:16,f:0.1,fi:2,cat:"veg",pack:{g:1500,l:"1,5 kg"}},
 bread:{n:"Vollkornbrot",cn:"全麦面包",k:220,p:7,c:40,f:1.5,fi:7,cat:"carb",tags:["gluten"],slice:50,pack:{g:500,l:"500 g"}},
 lentil:{n:"Rote Linsen, trocken",cn:"红扁豆",k:330,p:24,c:48,f:1.5,fi:11,cat:"carb",pack:{g:500,l:"500 g"}},
 banana:{n:"Bananen",cn:"香蕉",k:90,p:1.1,c:20,f:0.3,fi:2.6,cat:"veg",og:true,unit:{g:120,l:"Stück"},pack:{g:120,l:"Stück"}},
 berries:{n:"Beeren, TK",cn:"冷冻莓果",k:45,p:1,c:9,f:0.3,fi:4,cat:"veg",og:true,pack:{g:500,l:"500 g"}},
 broccoli:{n:"Brokkoli",cn:"西兰花",k:34,p:3,c:4,f:0.4,fi:3,cat:"veg",og:true,pack:{g:500,l:"500 g"}},
 pepper:{n:"Paprika",cn:"彩椒",k:30,p:1,c:5,f:0.3,fi:2,cat:"veg",og:true,unit:{g:160,l:"Stück"},pack:{g:160,l:"Stück"}},
 spinach:{n:"Blattspinat, TK",cn:"菠菜",k:23,p:2.9,c:1.6,f:0.4,fi:2.2,cat:"veg",og:true,pack:{g:450,l:"450 g"}},
 vegmix:{n:"Gemüsemischung, TK",cn:"冷冻什锦蔬菜",k:40,p:2,c:6,f:0.3,fi:3,cat:"veg",og:true,pack:{g:750,l:"750 g"}},
 bokchoy:{n:"Pak Choi",cn:"小青菜 / 上海青",k:13,p:1.5,c:2,f:0.2,fi:1,cat:"veg",og:true,pack:{g:500,l:"500 g"}},
 passata:{n:"Passierte Tomaten",cn:"番茄酱（无糖）",k:30,p:1.3,c:5,f:0.2,fi:1.2,cat:"misc",og:true,pack:{g:500,l:"500 g"}},
 oil:{n:"Olivenöl",cn:"橄榄油",k:884,p:0,c:0,f:100,cat:"misc",pack:{g:500,l:"0,5 l"},long:true},
 pb:{n:"Erdnussbutter",cn:"花生酱（无糖）",k:600,p:25,c:14,f:50,fi:6,cat:"misc",pack:{g:350,l:"350 g"},long:true},
 nuts:{n:"Mandeln",cn:"巴旦木",k:600,p:21,c:6,f:52,fi:12,cat:"misc",pack:{g:200,l:"200 g"}},
 salad:{n:"Blattsalat",cn:"生菜",k:15,p:1.2,c:1.5,f:0.2,fi:1.4,cat:"veg",og:true,pack:{g:250,l:"250 g"}},
 cucumber:{n:"Gurke",cn:"黄瓜",k:13,p:0.6,c:2,f:0.1,fi:0.5,cat:"veg",og:true,unit:{g:400,l:"Stück"},pack:{g:400,l:"Stück"}},
 avocado:{n:"Avocado",cn:"牛油果",k:160,p:2,c:2,f:15,fi:6.7,cat:"veg",og:true,unit:{g:150,l:"Stück"},pack:{g:150,l:"Stück"}}
};
const CATS={prot:"Fleisch, Fisch, Eier & Tofu",dairy:"Milchprodukte & Alternativen",carb:"Getreide & Hülsenfrüchte",veg:"Obst & Gemüse",misc:"Vorrat & Sonstiges"};

/* ---------- Mahlzeiten-Bausteine ---------- */
/* r: P/C/F = wird auf das Makroziel skaliert, x = feste Menge */
const MEALS=[
 {id:"oats",slot:"B",n:"Overnight Oats mit Beeren",prep:"Abends verrühren, über Nacht in den Kühlschrank.",items:[
  {c:["oats"],r:"C",min:30,max:140},{c:["quark","skyr","greek","soyyog"],r:"P",min:100,max:400},
  {c:["milk","soymilk"],r:"x",g:150},{c:["berries"],r:"x",g:100},{c:["nuts","pb"],r:"F",min:0,max:35}]},
 {id:"eggs",slot:"B",n:"Rührei mit Spinat und Vollkornbrot",prep:"Eier mit Eiklar verquirlen, Spinat mitgaren.",items:[
  {c:["egg"],r:"x",g:120,req:true},{c:["eggwhite","cottage"],r:"P",min:0,max:300},{c:["spinach"],r:"x",g:80},
  {c:["bread","potato"],r:"C",min:0,max:200},{c:["oil"],r:"F",min:0,max:12}]},
 {id:"bowl",slot:"B",n:"Joghurt-Bowl mit Banane und Erdnussbutter",prep:"In 3 Minuten fertig.",items:[
  {c:["skyr","greek","quark","soyyog"],r:"P",min:150,max:450},{c:["oats"],r:"C",min:0,max:110},
  {c:["banana"],r:"x",g:120},{c:["pb","nuts"],r:"F",min:0,max:35}]},
 {id:"chickrice",slot:"M",n:"Hähnchen, Reis und Brokkoli",prep:"Gut für Meal-Prep, hält 4 Tage im Kühlschrank.",items:[
  {c:["chicken","tofu"],r:"P",min:80,max:320},{c:["rice"],r:"C",min:30,max:190},{c:["broccoli"],r:"x",g:200},{c:["oil"],r:"F",min:0,max:30}]},
 {id:"bolo",slot:"M",n:"Vollkornnudeln Bolognese",prep:"Hack scharf anbraten, Paprika und Tomaten 15 Min. köcheln.",items:[
  {c:["beef","tofu"],r:"P",min:80,max:320},{c:["pasta","rice"],r:"C",min:30,max:180},{c:["passata"],r:"x",g:150},{c:["pepper"],r:"x",g:100},{c:["oil"],r:"F",min:0,max:25}]},
 {id:"salmon",slot:"M",n:"Lachs mit Ofenkartoffeln und Spinat",prep:"Kartoffeln 30 Min. bei 200 °C, Lachs die letzten 12 Min. dazu.",items:[
  {c:["salmon","chicken","tofu"],r:"P",min:80,max:280},{c:["potato"],r:"C",min:100,max:700},{c:["spinach"],r:"x",g:150},{c:["oil"],r:"F",min:0,max:20}]},
 {id:"wok",slot:"M",n:"Tofu-Wok mit Pak Choi und Reis",prep:"Tofu trocken tupfen und knusprig braten, Gemüse kurz mitbraten.",items:[
  {c:["tofu"],r:"P",min:100,max:450},{c:["rice"],r:"C",min:30,max:190},{c:["bokchoy","vegmix"],r:"x",g:200},{c:["oil"],r:"F",min:0,max:20}]},
 {id:"curry",slot:"M",n:"Linsen-Curry mit Hähnchen",prep:"Linsen 12 Min. mit Tomaten und Gemüse köcheln, Hähnchen separat braten.",items:[
  {c:["chicken","tofu","shrimp"],r:"P",min:60,max:280},{c:["lentil"],r:"C",min:30,max:150},{c:["vegmix"],r:"x",g:200},{c:["passata"],r:"x",g:100},{c:["oil"],r:"F",min:0,max:25}]},
 {id:"tunabowl",slot:"M",n:"Thunfisch-Reis-Bowl mit Avocado",prep:"Reis vorkochen, kalt oder warm essen.",items:[
  {c:["tuna","shrimp","chicken","tofu"],r:"P",min:80,max:300},{c:["rice"],r:"C",min:30,max:190},{c:["pepper"],r:"x",g:120},{c:["avocado","oil"],r:"F",min:0,max:150}]},
 /* K = kalte Abendessen für Wochenendtage, an denen nur mittags gekocht wird */
 {id:"abendbrot",slot:"K",n:"Abendbrot mit Hüttenkäse, Ei und Gurke",prep:"Ohne Kochen: Ei vom Vortag oder schnell gekocht.",items:[
  {c:["cottage","quark","soyyog"],r:"P",min:100,max:350},{c:["egg"],r:"x",g:60},{c:["bread"],r:"C",min:50,max:200},{c:["cucumber","pepper"],r:"x",g:150},{c:["nuts","avocado"],r:"F",min:0,max:40}]},
 {id:"tunasalad",slot:"K",n:"Salat mit Thunfisch und Vollkornbrot",prep:"Salat, Gurke und Paprika schneiden, mit Öl und Essig anmachen.",items:[
  {c:["tuna","tofu","cottage"],r:"P",min:60,max:300},{c:["salad"],r:"x",g:120},{c:["cucumber","pepper"],r:"x",g:150},{c:["bread"],r:"C",min:0,max:150},{c:["oil","avocado"],r:"F",min:0,max:25}]},
 {id:"shake",slot:"S",n:"Proteinshake mit Banane",prep:"Nach dem Training oder als Snack.",items:[
  {c:["whey","soyprot"],r:"P",min:20,max:50},{c:["milk","soymilk"],r:"x",g:250},{c:["banana"],r:"x",g:120}]},
 {id:"quarkber",slot:"S",n:"Quark mit Beeren und Mandeln",prep:"",items:[
  {c:["quark","skyr","greek","soyyog"],r:"P",min:100,max:450},{c:["berries"],r:"x",g:100},{c:["nuts"],r:"F",min:0,max:25}]},
 {id:"cottagebread",slot:"S",n:"Frischkäse-Brot mit Paprika",prep:"",items:[
  {c:["cottage","quark"],r:"P",min:100,max:300},{c:["bread"],r:"C",min:50,max:150},{c:["pepper"],r:"x",g:80}]}
];
const SLOTNAME={B:"Frühstück",L:"Mittagessen",D:"Abendessen",S:"Snack"};
const DAYS=["Mo","Di","Mi","Do","Fr","Sa","So"];
const DAYLONG=["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const EXCL=[["meat","Kein Fleisch"],["fish","Kein Fisch, keine Meeresfrüchte"],["dairy","Keine Milchprodukte"],["egg","Keine Eier"],["soy","Kein Soja"],["gluten","Kein Gluten (inkl. Hafer)"]];
const STEPS=[["s1","Unter 5.000","überwiegend sitzend",1.25],["s2","5.000–8.000","Uni, kurze Wege",1.35],["s3","8.000–12.000","viel zu Fuß",1.45],["s4","Über 12.000","körperliche Arbeit",1.6]];
const GOALS=[["recomp","Rekomposition","−0,25 % Gewicht pro Woche, Fokus Muskelaufbau",0.25],["moderat","Moderat","−0,5 % pro Woche, bewährter Mittelweg",0.5],["zuegig","Zügig","−0,75 % pro Woche, höheres Risiko für Kraftverlust",0.75]];

/* ---------- Tagebuch-Lebensmittel (je 100 g bzw. 100 ml) ---------- */
// [Name, kcal, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe, Obst/Gemüse]
const DIARY_TABLE=[
 ["Haferflocken",372,13.5,58.7,7,10],["Vollkornbrot",220,7.5,39,1.5,7.5],["Weizenbrötchen",270,9,52,2,3],
 ["Toastbrot",265,8,48,4,3],["Knäckebrot (Roggen)",340,9.5,66,1.5,15],["Reis, gekocht",130,2.7,28,0.3,0.4],
 ["Vollkornreis, gekocht",123,2.7,25.6,1,1.6],["Nudeln, gekocht",150,5.5,30,0.9,1.8],["Vollkornnudeln, gekocht",140,5.8,26.5,1,4.5],
 ["Kartoffeln, gekocht",72,2,15,0.1,2],["Süßkartoffel, gekocht",86,1.6,20,0.1,3],["Quinoa, gekocht",120,4.4,21.3,1.9,2.8],
 ["Couscous, gekocht",112,3.8,23,0.2,1.4],["Müsli (ohne Zucker)",360,10,60,7,9],["Cornflakes",375,7.5,84,0.9,3],
 ["Pommes frites",290,3.5,35,15,3.5],
 ["Brokkoli",34,2.8,4,0.4,3,1],["Karotte",36,0.9,7.5,0.2,3,1],["Tomate",18,0.9,3,0.2,1.2,1],["Gurke",13,0.6,2,0.1,0.5,1],
 ["Paprika, rot",31,1,6,0.3,2.1,1],["Spinat",23,2.9,1.4,0.4,2.2,1],["Blattsalat",15,1.2,1.5,0.2,1.4,1],["Zucchini",17,1.2,2.5,0.3,1,1],
 ["Blumenkohl",25,2,3,0.3,2.4,1],["Zwiebel",40,1.2,8,0.1,1.8,1],["Champignons",22,3.1,0.6,0.3,2,1],["Avocado",160,2,2,15,6.7,1],
 ["Mais (Dose)",85,2.9,15,1.2,2.5,1],["Erbsen, grün",81,5.4,12,0.4,5,1],
 ["Apfel",52,0.3,12,0.2,2.4,1],["Banane",89,1.1,20,0.3,2.6,1],["Orange",47,0.9,9,0.1,2.2,1],["Erdbeeren",32,0.7,5.5,0.3,2,1],
 ["Heidelbeeren",57,0.7,12,0.3,2.4,1],["Weintrauben",69,0.7,16,0.2,0.9,1],["Birne",57,0.4,12.4,0.1,3.1,1],["Kiwi",61,1.1,10,0.5,3,1],
 ["Mango",60,0.8,13,0.4,1.6,1],["Rosinen",299,3.1,66,0.5,3.7,1],
 ["Linsen, gekocht",116,9,17,0.4,7.9],["Kichererbsen, gekocht",164,8.9,23,2.6,7.6],["Kidneybohnen, gekocht",127,8.7,18,0.5,6.4],
 ["Tofu, natur",144,15,2,8.5,1.5],["Tempeh",193,19,9,11,5],["Mandeln",579,21,9,50,12.5],["Walnüsse",654,15,7,65,6.7],
 ["Erdnüsse",567,26,8,49,8.5],["Erdnussbutter",590,25,13,50,6],["Chiasamen",486,17,8,31,34],["Leinsamen",534,18,2,42,27],
 ["Hummus",177,7.9,14,9.6,6],
 ["Milch 1,5 %",47,3.4,4.8,1.5,0],["Milch 3,5 %",64,3.3,4.8,3.5,0],["Hafermilch",46,0.5,6.7,1.5,0.8],["Sojadrink",39,3.3,2.5,1.8,0.5],
 ["Naturjoghurt 1,5 %",47,4,4.8,1.5,0],["Griechischer Joghurt 10 %",120,4.5,4,10,0],["Skyr",63,11,4,0.2,0],["Magerquark",67,12,4,0.3,0],
 ["Hüttenkäse",98,12.5,3,4.3,0],["Gouda",356,25,0,28,0],["Mozzarella",254,18,1,19,0],["Feta",264,17,0.5,21,0],
 ["Parmesan",392,36,0,26,0],["Butter",741,0.7,0.6,83,0],["Ei (Hühnerei)",155,13,1.1,11,0],
 ["Hähnchenbrust",110,23,0,1.5,0],["Putenbrust",105,24,0,1,0],["Rinderhack",250,18,0,20,0],["Rindersteak",180,26,0,8,0],
 ["Schweineschnitzel",112,22,0,2.5,0],["Salami",380,22,1,32,0],["Kochschinken",110,19,1,3.5,0],["Lachs",208,20,0,13.5,0],
 ["Thunfisch (Dose, Wasser)",116,26,0,1,0],["Kabeljau",82,18,0,0.7,0],["Garnelen",99,24,0.2,0.3,0],
 ["Olivenöl",884,0,0,100,0],["Rapsöl",884,0,0,100,0],
 ["Honig",304,0.3,82,0,0],["Zucker",400,0,100,0,0],["Zartbitterschokolade 70 %",580,7.8,34,43,11],["Vollmilchschokolade",535,7.6,59,30,3.4],
 ["Kartoffelchips",536,6,53,34,4],["Gummibärchen",343,6.9,77,0.1,0],["Pizza Margherita",245,10,30,9,2],
 ["Orangensaft",45,0.7,10,0.2,0.2],["Cola",42,0,10.6,0,0],["Bier",43,0.5,3.6,0,0],["Rotwein",85,0.1,2.6,0,0],["Kaffee mit Milch",20,1,1.5,1,0]
];
const DIARY_FOODS=(()=>{
  const list=DIARY_TABLE.map(([n,k,p,c,f,fi,og],i)=>({id:"d"+i,n,k,p,c,f,fi,og:!!og}));
  const names=new Set(list.map(x=>x.n.toLowerCase()));
  for(const id in FOODS){const x=FOODS[id];if(!names.has(x.n.toLowerCase()))list.push({id:"p:"+id,n:x.n,k:x.k,p:x.p,c:x.c,f:x.f,fi:x.fi||0,og:!!x.og})}
  return list;
})();
