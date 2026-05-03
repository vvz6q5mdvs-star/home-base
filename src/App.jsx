import { useState, useEffect, useRef, useCallback } from “react”;

const DAYS = [“Mon”,“Tue”,“Wed”,“Thu”,“Fri”,“Sat”,“Sun”];
const FULL_DAYS = [“Monday”,“Tuesday”,“Wednesday”,“Thursday”,“Friday”,“Saturday”,“Sunday”];
const FAMILY_SLOTS = [“Breakfast”,“Lunch”,“Snack”,“Dinner”];
const ADHYA_SLOTS = [“Breakfast”,“Lunch”,“Snack”,“Dinner”];
const DAYCARE_DAYS = [“Mon”,“Tue”,“Wed”,“Thu”,“Fri”];
const DAYCARE_SLOTS = [“Breakfast”,“Lunch”];
const REMINDER_CATS = [“Health”,“Work”,“Home”,“Personal”,“Other”];
const CAT_COLORS = { Health:”#34d399”, Work:”#60a5fa”, Home:”#fbbf24”, Personal:”#f472b6”, Other:”#94a3b8” };

const SAMPLE_RECIPES = [
{ id:“r1”, name:“Dal Tadka”, tags:[“lunch”,“dinner”,“high protein”,“south indian”], ingredients:“1 cup masoor dal, 1 onion, 2 tomatoes, cumin, mustard seeds, turmeric, ghee”, method:“Pressure cook dal. Prepare tadka with ghee, cumin, onions, tomatoes. Mix and simmer.”, macros:{ cal:320, protein:18, carbs:42, fat:8 }, kidsFriendly:true },
{ id:“r2”, name:“Oats Overnight”, tags:[“breakfast”,“high protein”,“quick”], ingredients:“half cup oats, 1 scoop whey, half cup milk, chia seeds, banana”, method:“Mix all ingredients. Refrigerate overnight.”, macros:{ cal:420, protein:32, carbs:48, fat:9 }, kidsFriendly:false },
{ id:“r3”, name:“Paneer Bhurji”, tags:[“breakfast”,“high protein”,“quick”], ingredients:“200g paneer, 1 onion, 1 tomato, green chilli, spices”, method:“Crumble paneer. Saute onion, tomato, chilli. Add paneer and spices.”, macros:{ cal:380, protein:24, carbs:12, fat:22 }, kidsFriendly:true },
{ id:“r4”, name:“Vegetable Khichdi”, tags:[“lunch”,“dinner”,“kids”,“comfort”], ingredients:“half cup rice, quarter cup moong dal, mixed veggies, ghee, cumin, turmeric”, method:“Pressure cook rice and dal together. Add veggies and temper with ghee.”, macros:{ cal:290, protein:12, carbs:50, fat:6 }, kidsFriendly:true },
];

const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){} };
const load = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; } };
const emptyWeek = (slots) => DAYS.reduce((a,d) => { a[d] = slots.reduce((b,s) => { b[s]=””; return b; }, {}); return a; }, {});

function useVoice(onResult) {
const recRef = useRef(null);
const [listening, setListening] = useState(false);
const start = useCallback(() => {
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) { alert(“Voice not supported in this browser”); return; }
const r = new SR();
r.lang = “en-US”; r.interimResults = false;
r.onresult = (e) => { onResult(e.results[0][0].transcript); setListening(false); };
r.onerror = () => setListening(false);
r.onend = () => setListening(false);
recRef.current = r;
r.start(); setListening(true);
}, [onResult]);
const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);
return { listening, start, stop };
}

function VoiceBtn({ onResult, style }) {
const { listening, start, stop } = useVoice(onResult);
return (
<button onClick={listening ? stop : start} style={{ …S.voiceBtn, …(listening ? S.voiceBtnActive : {}), …style }}>
{listening ? “stop” : “mic”}
</button>
);
}

function TextInputWithVoice({ value, onChange, placeholder, style, multiline }) {
const Tag = multiline ? “textarea” : “input”;
return (
<div style={{ position:“relative”, display:“flex”, alignItems:“center”, flex:1 }}>
<Tag value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
style={{ …S.input, …(multiline ? S.textarea : {}), paddingRight:36, …style }} rows={multiline ? 3 : undefined} />
<VoiceBtn onResult={onChange} style={{ position:“absolute”, right:4, top:“50%”, transform:“translateY(-50%)”, width:28, height:28, fontSize:12 }} />
</div>
);
}

function RecipePicker({ recipes, onSelect, onClose, kidsOnly }) {
const [q, setQ] = useState(””);
const [tag, setTag] = useState(””);
const allTags = […new Set(recipes.flatMap(r => r.tags))].sort();
const filtered = recipes.filter(r => {
if (kidsOnly && !r.kidsFriendly) return false;
if (tag && !r.tags.includes(tag)) return false;
if (q && !r.name.toLowerCase().includes(q.toLowerCase()) && !r.tags.some(t => t.includes(q.toLowerCase()))) return false;
return true;
});
return (
<div style={S.sheetOverlay} onClick={onClose}>
<div style={S.sheet} onClick={e => e.stopPropagation()}>
<div style={S.sheetHandle} />
<div style={S.sheetHeader}>
<span style={S.sheetTitle}>Pick a Recipe</span>
<button onClick={onClose} style={S.closeBtn}>X</button>
</div>
<div style={{ display:“flex”, gap:8, marginBottom:10 }}>
<TextInputWithVoice value={q} onChange={setQ} placeholder=“Search by name or tag…” style={{ fontSize:13 }} />
</div>
<div style={S.tagRow}>
<button onClick={() => setTag(””)} style={{ …S.tagChip, …(tag===””?S.tagChipActive:{}) }}>All</button>
{allTags.map(t => (
<button key={t} onClick={() => setTag(t===tag?””:t)} style={{ …S.tagChip, …(tag===t?S.tagChipActive:{}) }}>{t}</button>
))}
</div>
<div style={{ overflowY:“auto”, maxHeight:320 }}>
{filtered.length === 0 && <p style={S.empty}>No recipes found</p>}
{filtered.map(r => (
<div key={r.id} style={S.recipePickRow} onClick={() => onSelect(r)}>
<div>
<div style={S.recipePickName}>{r.name}</div>
<div style={S.recipePickTags}>{r.tags.map(t => <span key={t} style={S.miniTag}>{t}</span>)}</div>
</div>
{r.macros && <span style={S.macroChip}>{r.macros.cal} kcal</span>}
</div>
))}
</div>
<button style={S.freeTextBtn} onClick={() => onSelect(null)}>Type freely instead</button>
</div>
</div>
);
}

function PlannerTab({ recipes }) {
const [who, setWho] = useState(“family”);
const [familyPlan, setFamilyPlan] = useState(() => load(“familyPlan”, emptyWeek(FAMILY_SLOTS)));
const [adhyaPlan, setAdhyaPlan] = useState(() => load(“adhyaPlan”, emptyWeek(ADHYA_SLOTS)));
const [openDay, setOpenDay] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay()-1]);
const [picker, setPicker] = useState(null);
const [editCell, setEditCell] = useState(null);
const [editVal, setEditVal] = useState(””);

const plan = who === “family” ? familyPlan : adhyaPlan;
const slots = FAMILY_SLOTS;

useEffect(() => { save(“familyPlan”, familyPlan); }, [familyPlan]);
useEffect(() => { save(“adhyaPlan”, adhyaPlan); }, [adhyaPlan]);

const setCell = (day, slot, val) => {
if (who === “family”) setFamilyPlan(p => ({ …p, [day]: { …p[day], [slot]: val } }));
else setAdhyaPlan(p => ({ …p, [day]: { …p[day], [slot]: val } }));
};

const isDaycare = (day, slot) => who === “adhya” && DAYCARE_DAYS.includes(day) && DAYCARE_SLOTS.includes(slot);

const dayMacros = (day) => {
if (who !== “family”) return null;
let totals = { cal:0, protein:0, carbs:0, fat:0 };
let hasAny = false;
FAMILY_SLOTS.forEach(slot => {
const val = familyPlan[day][slot];
const recipe = recipes.find(r => r.name === val);
if (recipe && recipe.macros) { hasAny=true; totals.cal+=recipe.macros.cal; totals.protein+=recipe.macros.protein; totals.carbs+=recipe.macros.carbs; totals.fat+=recipe.macros.fat; }
});
return hasAny ? totals : null;
};

return (
<div style={S.tabContent}>
<div style={S.plannerToggle}>
<button onClick={() => setWho(“family”)} style={{ …S.toggleBtn, …(who===“family”?S.toggleActive:{}) }}>Family</button>
<button onClick={() => setWho(“adhya”)} style={{ …S.toggleBtn, …(who===“adhya”?S.toggleActiveKids:{}) }}>Adhya</button>
</div>
{who === “adhya” && (
<div style={S.infoBox}>Weekday breakfast and lunch happen at daycare</div>
)}
{DAYS.map(day => {
const macros = dayMacros(day);
const isOpen = openDay === day;
return (
<div key={day} style={S.dayCard}>
<button style={S.dayHeader} onClick={() => setOpenDay(isOpen ? null : day)}>
<span style={S.dayName}>{FULL_DAYS[DAYS.indexOf(day)]}</span>
<div style={{ display:“flex”, alignItems:“center”, gap:8 }}>
{macros && <span style={S.macroSummary}>{macros.cal} kcal</span>}
<span style={S.chevron}>{isOpen ? “^” : “v”}</span>
</div>
</button>
{isOpen && (
<div style={S.slotsContainer}>
{slots.map(slot => {
const dc = isDaycare(day, slot);
const cellKey = who + “-” + day + “-” + slot;
const isEditing = editCell === cellKey;
const val = plan[day][slot];
return (
<div key={slot} style={S.slotRow}>
<span style={S.slotLabel}>{slot}</span>
{dc ? (
<div style={S.daycareCell}>Daycare</div>
) : isEditing ? (
<div style={{ flex:1, display:“flex”, gap:6, alignItems:“center” }}>
<TextInputWithVoice value={editVal} onChange={setEditVal} placeholder=“What is cooking?” style={{ fontSize:13 }} />
<button style={S.saveBtn} onClick={() => { setCell(day,slot,editVal); setEditCell(null); }}>OK</button>
</div>
) : (
<div style={S.cellRow}>
<div style={S.cellValue} onClick={() => { setEditCell(cellKey); setEditVal(val); }}>
{val || <span style={S.cellPlaceholder}>Tap to add</span>}
</div>
<button style={S.recipePickBtn} onClick={() => setPicker({ day, slot })}>Book</button>
</div>
)}
</div>
);
})}
{macros && (
<div style={S.macroBar}>
<span style={S.macroItem}>Cal: {macros.cal}</span>
<span style={S.macroItem}>Protein: {macros.protein}g</span>
<span style={S.macroItem}>Carbs: {macros.carbs}g</span>
<span style={S.macroItem}>Fat: {macros.fat}g</span>
</div>
)}
</div>
)}
</div>
);
})}
{picker && (
<RecipePicker
recipes={recipes}
kidsOnly={who === “adhya”}
onSelect={(r) => {
if (r) setCell(picker.day, picker.slot, r.name);
else { setEditCell(who + “-” + picker.day + “-” + picker.slot); setEditVal(””); }
setPicker(null);
}}
onClose={() => setPicker(null)}
/>
)}
</div>
);
}

function RecipesTab({ recipes, setRecipes }) {
const [search, setSearch] = useState(””);
const [filterTag, setFilterTag] = useState(””);
const [expanded, setExpanded] = useState(null);
const [showForm, setShowForm] = useState(false);
const [form, setForm] = useState({ name:””, tags:””, ingredients:””, method:””, kidsFriendly:false, macros:{ cal:””, protein:””, carbs:””, fat:”” } });
const [nextId, setNextId] = useState(() => load(“recipeNextId”, 100));

useEffect(() => { save(“recipes”, recipes); }, [recipes]);
useEffect(() => { save(“recipeNextId”, nextId); }, [nextId]);

const allTags = […new Set(recipes.flatMap(r => r.tags))].sort();
const filtered = recipes.filter(r => {
if (filterTag && !r.tags.includes(filterTag)) return false;
if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.tags.some(t => t.includes(search.toLowerCase()))) return false;
return true;
});

const saveRecipe = () => {
if (!form.name.trim()) return;
const tags = form.tags.split(”,”).map(t => t.trim().toLowerCase()).filter(Boolean);
const macros = (form.macros.cal || form.macros.protein) ? { cal:+form.macros.cal||0, protein:+form.macros.protein||0, carbs:+form.macros.carbs||0, fat:+form.macros.fat||0 } : null;
setRecipes(r => […r, { id:“r”+nextId, name:form.name, tags, ingredients:form.ingredients, method:form.method, kidsFriendly:form.kidsFriendly, macros }]);
setNextId(n => n+1);
setForm({ name:””, tags:””, ingredients:””, method:””, kidsFriendly:false, macros:{ cal:””, protein:””, carbs:””, fat:”” } });
setShowForm(false);
};

return (
<div style={S.tabContent}>
<div style={S.rowBetween}>
<h2 style={S.sectionTitle}>Recipes</h2>
<button style={S.addBtn} onClick={() => setShowForm(v => !v)}>{showForm ? “Cancel” : “+ New”}</button>
</div>
{showForm && (
<div style={S.formCard}>
<div style={S.formRow}><TextInputWithVoice value={form.name} onChange={v => setForm(f=>({…f,name:v}))} placeholder=“Recipe name” /></div>
<div style={S.formRow}><TextInputWithVoice value={form.tags} onChange={v => setForm(f=>({…f,tags:v}))} placeholder=“Tags: breakfast, high protein…” /></div>
<div style={S.formRow}><TextInputWithVoice value={form.ingredients} onChange={v => setForm(f=>({…f,ingredients:v}))} placeholder=“Ingredients…” multiline /></div>
<div style={S.formRow}><TextInputWithVoice value={form.method} onChange={v => setForm(f=>({…f,method:v}))} placeholder=“Method / steps…” multiline /></div>
<div style={{ display:“flex”, gap:8, marginBottom:10, flexWrap:“wrap” }}>
<input type=“number” placeholder=“Calories” value={form.macros.cal} onChange={e => setForm(f=>({…f,macros:{…f.macros,cal:e.target.value}}))} style={{ …S.input, width:80 }} />
<input type=“number” placeholder=“Protein g” value={form.macros.protein} onChange={e => setForm(f=>({…f,macros:{…f.macros,protein:e.target.value}}))} style={{ …S.input, width:80 }} />
<input type=“number” placeholder=“Carbs g” value={form.macros.carbs} onChange={e => setForm(f=>({…f,macros:{…f.macros,carbs:e.target.value}}))} style={{ …S.input, width:80 }} />
<input type=“number” placeholder=“Fat g” value={form.macros.fat} onChange={e => setForm(f=>({…f,macros:{…f.macros,fat:e.target.value}}))} style={{ …S.input, width:80 }} />
</div>
<label style={S.checkLabel}>
<input type=“checkbox” checked={form.kidsFriendly} onChange={e => setForm(f=>({…f,kidsFriendly:e.target.checked}))} />
<span style={{ marginLeft:8 }}>Kid-friendly (shows in Adhya planner)</span>
</label>
<button style={{ …S.addBtn, width:“100%”, marginTop:12 }} onClick={saveRecipe}>Save Recipe</button>
</div>
)}
<div style={{ display:“flex”, gap:8, marginBottom:10 }}>
<TextInputWithVoice value={search} onChange={setSearch} placeholder=“Search recipes…” style={{ fontSize:13 }} />
</div>
<div style={S.tagRow}>
<button onClick={() => setFilterTag(””)} style={{ …S.tagChip, …(filterTag===””?S.tagChipActive:{}) }}>All</button>
{allTags.map(t => (
<button key={t} onClick={() => setFilterTag(t===filterTag?””:t)} style={{ …S.tagChip, …(filterTag===t?S.tagChipActive:{}) }}>{t}</button>
))}
</div>
{filtered.map(r => (
<div key={r.id} style={S.recipeCard}>
<div style={S.recipeCardHeader} onClick={() => setExpanded(expanded===r.id ? null : r.id)}>
<div>
<div style={S.recipeCardName}>{r.name} {r.kidsFriendly ? “(kids)” : “”}</div>
<div style={S.recipePickTags}>{r.tags.map(t => <span key={t} style={S.miniTag}>{t}</span>)}</div>
</div>
<div style={{ display:“flex”, gap:8, alignItems:“center” }}>
{r.macros && <span style={S.macroChip}>{r.macros.cal} kcal</span>}
<span style={S.chevron}>{expanded===r.id ? “^” : “v”}</span>
</div>
</div>
{expanded === r.id && (
<div style={S.recipeBody}>
<p style={S.recipeSection}>Ingredients</p>
<p style={S.recipeText}>{r.ingredients}</p>
<p style={S.recipeSection}>Method</p>
<p style={S.recipeText}>{r.method}</p>
{r.macros && (
<div style={S.macroBar}>
<span style={S.macroItem}>Cal: {r.macros.cal}</span>
<span style={S.macroItem}>Protein: {r.macros.protein}g</span>
<span style={S.macroItem}>Carbs: {r.macros.carbs}g</span>
<span style={S.macroItem}>Fat: {r.macros.fat}g</span>
</div>
)}
<button style={S.deleteBtn} onClick={() => setRecipes(r2 => r2.filter(x => x.id !== r.id))}>Delete Recipe</button>
</div>
)}
</div>
))}
{filtered.length === 0 && <p style={S.empty}>No recipes yet. Add your first one!</p>}
</div>
);
}

function PantryTab() {
const [pantry, setPantry] = useState(() => load(“pantry”, [
{ id:1, name:“Spinach”, cat:“veggie”, qty:2, unit:“bunches”, emoji:“🥬” },
{ id:2, name:“Tomatoes”, cat:“veggie”, qty:6, unit:“pcs”, emoji:“🍅” },
{ id:3, name:“Carrots”, cat:“veggie”, qty:4, unit:“pcs”, emoji:“🥕” },
{ id:4, name:“Bananas”, cat:“fruit”, qty:5, unit:“pcs”, emoji:“🍌” },
{ id:5, name:“Apples”, cat:“fruit”, qty:3, unit:“pcs”, emoji:“🍎” },
]));
const [showAdd, setShowAdd] = useState(false);
const [form, setForm] = useState({ name:””, cat:“veggie”, qty:1, unit:“pcs”, emoji:“🥦” });
const [nextId, setNextId] = useState(() => load(“pantryNextId”, 20));

useEffect(() => { save(“pantry”, pantry); }, [pantry]);
useEffect(() => { save(“pantryNextId”, nextId); }, [nextId]);

const adjust = (id, d) => setPantry(p => p.map(x => x.id===id ? {…x, qty:Math.max(0,x.qty+d)} : x));
const remove = (id) => setPantry(p => p.filter(x => x.id!==id));
const addItem = () => {
if (!form.name.trim()) return;
setPantry(p => […p, { …form, id:nextId }]);
setNextId(n => n+1);
setForm({ name:””, cat:“veggie”, qty:1, unit:“pcs”, emoji:“🥦” });
setShowAdd(false);
};

const lowStock = pantry.filter(x => x.qty <= 1);

return (
<div style={S.tabContent}>
<div style={S.rowBetween}>
<h2 style={S.sectionTitle}>Pantry</h2>
<button style={S.addBtn} onClick={() => setShowAdd(v=>!v)}>{showAdd ? “Cancel” : “+ Add”}</button>
</div>
{lowStock.length > 0 && (
<div style={S.alertBox}>Low stock: {lowStock.map(x => x.name).join(”, “)}</div>
)}
{showAdd && (
<div style={S.formCard}>
<div style={{ display:“flex”, gap:8, marginBottom:10, flexWrap:“wrap”, alignItems:“center” }}>
<input value={form.emoji} onChange={e => setForm(f=>({…f,emoji:e.target.value}))} style={{ …S.input, width:50, textAlign:“center” }} placeholder=“emoji” />
<TextInputWithVoice value={form.name} onChange={v => setForm(f=>({…f,name:v}))} placeholder=“Item name” style={{ fontSize:13 }} />
<select value={form.cat} onChange={e => setForm(f=>({…f,cat:e.target.value}))} style={S.select}>
<option value="veggie">Vegetable</option>
<option value="fruit">Fruit</option>
</select>
</div>
<div style={{ display:“flex”, gap:8, alignItems:“center” }}>
<input type=“number” value={form.qty} min={0} onChange={e => setForm(f=>({…f,qty:+e.target.value}))} style={{ …S.input, width:70 }} />
<TextInputWithVoice value={form.unit} onChange={v => setForm(f=>({…f,unit:v}))} placeholder=“unit” style={{ fontSize:13, width:80 }} />
<button style={S.addBtn} onClick={addItem}>Add</button>
</div>
</div>
)}
{[“veggie”,“fruit”].map(cat => {
const items = pantry.filter(x => x.cat===cat);
return (
<div key={cat} style={{ marginBottom:24 }}>
<h3 style={S.groupLabel}>{cat===“veggie” ? “Vegetables” : “Fruits”}</h3>
{items.length===0 && <p style={S.empty}>Nothing here yet.</p>}
<div style={S.pantryGrid}>
{items.map(item => (
<div key={item.id} style={{ …S.pantryCard, …(item.qty===0?S.pantryEmpty:{}) }}>
<button style={S.pantryDelete} onClick={() => remove(item.id)}>X</button>
<span style={S.pantryEmoji}>{item.emoji}</span>
<span style={S.pantryName}>{item.name}</span>
<div style={S.qtyRow}>
<button style={S.qtyBtn} onClick={() => adjust(item.id,-1)}>-</button>
<span style={S.qtyNum}>{item.qty}<span style={S.qtyUnit}> {item.unit}</span></span>
<button style={S.qtyBtn} onClick={() => adjust(item.id,1)}>+</button>
</div>
{item.qty===0 && <span style={S.outBadge}>Out!</span>}
{item.qty===1 && <span style={S.lowBadge}>Low</span>}
</div>
))}
</div>
</div>
);
})}
</div>
);
}

function RemindersTab() {
const [reminders, setReminders] = useState(() => load(“reminders”, [
{ id:1, text:“Take vitamins”, day:“Mon”, time:“08:00”, cat:“Health”, done:false },
{ id:2, text:“Grocery run”, day:“Wed”, time:“17:00”, cat:“Home”, done:false },
]));
const [form, setForm] = useState({ text:””, day:“Mon”, time:“09:00”, cat:“Health” });
const [nextId, setNextId] = useState(() => load(“reminderNextId”, 10));

useEffect(() => { save(“reminders”, reminders); }, [reminders]);
useEffect(() => { save(“reminderNextId”, nextId); }, [nextId]);

const add = () => {
if (!form.text.trim()) return;
setReminders(r => […r, { …form, id:nextId, done:false }]);
setNextId(n => n+1);
setForm({ text:””, day:“Mon”, time:“09:00”, cat:“Health” });
};

return (
<div style={S.tabContent}>
<h2 style={S.sectionTitle}>Reminders</h2>
<div style={S.formCard}>
<div style={{ display:“flex”, gap:8, marginBottom:10 }}>
<TextInputWithVoice value={form.text} onChange={v => setForm(f=>({…f,text:v}))} placeholder=“Reminder…” style={{ fontSize:13 }} />
</div>
<div style={{ display:“flex”, gap:8, flexWrap:“wrap” }}>
<select value={form.day} onChange={e => setForm(f=>({…f,day:e.target.value}))} style={S.select}>
{DAYS.map(d => <option key={d}>{d}</option>)}
</select>
<input type=“time” value={form.time} onChange={e => setForm(f=>({…f,time:e.target.value}))} style={S.input} />
<select value={form.cat} onChange={e => setForm(f=>({…f,cat:e.target.value}))} style={S.select}>
{REMINDER_CATS.map(c => <option key={c}>{c}</option>)}
</select>
<button style={S.addBtn} onClick={add}>Add</button>
</div>
</div>
{DAYS.map(d => {
const dayR = reminders.filter(r => r.day===d);
if (!dayR.length) return null;
return (
<div key={d} style={{ marginBottom:20 }}>
<h3 style={S.groupLabel}>{FULL_DAYS[DAYS.indexOf(d)]}</h3>
{dayR.map(r => (
<div key={r.id} style={{ …S.reminderRow, opacity:r.done?0.5:1 }}>
<button onClick={() => setReminders(rs => rs.map(x => x.id===r.id?{…x,done:!x.done}:x))} style={S.checkBtn}>{r.done ? “done” : “todo”}</button>
<div style={{ flex:1 }}>
<div style={{ …S.reminderText, textDecoration:r.done?“line-through”:“none” }}>{r.text}</div>
<div style={S.reminderMeta}>{r.time}</div>
</div>
<span style={{ …S.catBadge, background:CAT_COLORS[r.cat] }}>{r.cat}</span>
<button onClick={() => setReminders(rs => rs.filter(x => x.id!==r.id))} style={S.iconBtn}>X</button>
</div>
))}
</div>
);
})}
{reminders.length===0 && <p style={S.empty}>No reminders yet!</p>}
</div>
);
}

export default function App() {
const [tab, setTab] = useState(“planner”);
const [recipes, setRecipes] = useState(() => load(“recipes”, SAMPLE_RECIPES));

const tabs = [
{ key:“planner”, label:“Planner”, icon:“Cal” },
{ key:“recipes”, label:“Recipes”, icon:“Book” },
{ key:“pantry”,  label:“Pantry”,  icon:“Box” },
{ key:“reminders”, label:“Remind”, icon:“Bell” },
];

return (
<div style={S.app}>
<div style={S.content}>
{tab===“planner”   && <PlannerTab recipes={recipes} />}
{tab===“recipes”   && <RecipesTab recipes={recipes} setRecipes={setRecipes} />}
{tab===“pantry”    && <PantryTab />}
{tab===“reminders” && <RemindersTab />}
</div>
<nav style={S.bottomNav}>
{tabs.map(t => (
<button key={t.key} onClick={() => setTab(t.key)} style={{ …S.navTab, …(tab===t.key?S.navTabActive:{}) }}>
<span style={S.navIcon}>{t.icon}</span>
<span style={S.navLabel}>{t.label}</span>
</button>
))}
</nav>
</div>
);
}

const S = {
app: { minHeight:“100vh”, background:”#0b0e14”, color:”#e2e8f0”, fontFamily:“Nunito, DM Sans, sans-serif”, display:“flex”, flexDirection:“column”, maxWidth:480, margin:“0 auto”, position:“relative” },
content: { flex:1, overflowY:“auto”, paddingBottom:80 },
tabContent: { padding:“20px 16px” },
bottomNav: { position:“fixed”, bottom:0, left:“50%”, transform:“translateX(-50%)”, width:“100%”, maxWidth:480, background:”#111520”, borderTop:“1px solid #1e2535”, display:“flex”, zIndex:100 },
navTab: { flex:1, display:“flex”, flexDirection:“column”, alignItems:“center”, padding:“10px 4px 12px”, background:“none”, border:“none”, cursor:“pointer”, gap:2 },
navTabActive: { background:”#141c2e” },
navIcon: { fontSize:11, color:”#94a3b8” },
navLabel: { fontSize:10, color:”#64748b”, fontWeight:600, letterSpacing:0.5, textTransform:“uppercase” },
plannerToggle: { display:“flex”, background:”#111520”, borderRadius:10, padding:4, marginBottom:16, gap:4 },
toggleBtn: { flex:1, padding:“8px 0”, borderRadius:8, border:“none”, background:“transparent”, color:”#64748b”, fontWeight:700, fontSize:14, cursor:“pointer” },
toggleActive: { background:”#1e3a5f”, color:”#60a5fa” },
toggleActiveKids: { background:”#2d1f3d”, color:”#e879f9” },
infoBox: { background:”#1a2535”, border:“1px solid #2a3a50”, borderRadius:8, padding:“10px 12px”, fontSize:13, color:”#94a3b8”, marginBottom:12 },
alertBox: { background:”#2d1515”, border:“1px solid #7f1d1d”, borderRadius:8, padding:“10px 12px”, fontSize:13, color:”#fca5a5”, marginBottom:12 },
dayCard: { background:”#111520”, border:“1px solid #1e2535”, borderRadius:12, marginBottom:10, overflow:“hidden” },
dayHeader: { width:“100%”, display:“flex”, justifyContent:“space-between”, alignItems:“center”, padding:“14px 16px”, background:“none”, border:“none”, color:”#e2e8f0”, cursor:“pointer”, textAlign:“left” },
dayName: { fontWeight:700, fontSize:15 },
chevron: { color:”#475569”, fontSize:12 },
macroSummary: { fontSize:11, color:”#60a5fa”, background:”#1e2a45”, padding:“2px 8px”, borderRadius:99 },
slotsContainer: { borderTop:“1px solid #1e2535”, padding:“4px 0 8px” },
slotRow: { display:“flex”, alignItems:“center”, padding:“8px 16px”, gap:10 },
slotLabel: { fontSize:12, color:”#64748b”, fontWeight:700, width:72, flexShrink:0, textTransform:“uppercase”, letterSpacing:0.5 },
daycareCell: { flex:1, fontSize:13, color:”#475569”, fontStyle:“italic” },
cellRow: { flex:1, display:“flex”, alignItems:“center”, gap:6 },
cellValue: { flex:1, fontSize:14, color:”#cbd5e1”, padding:“6px 8px”, background:”#0b0e14”, borderRadius:6, minHeight:32, display:“flex”, alignItems:“center”, cursor:“pointer”, border:“1px solid #1e2535” },
cellPlaceholder: { color:”#334155”, fontSize:13 },
recipePickBtn: { background:”#1e2535”, border:“none”, borderRadius:6, padding:“6px 8px”, cursor:“pointer”, fontSize:12, color:”#94a3b8” },
saveBtn: { background:”#1e3a5f”, color:”#60a5fa”, border:“none”, borderRadius:6, padding:“6px 12px”, cursor:“pointer”, fontWeight:700 },
macroBar: { display:“flex”, gap:8, padding:“8px 16px”, flexWrap:“wrap” },
macroItem: { fontSize:12, color:”#64748b”, background:”#0b0e14”, padding:“4px 8px”, borderRadius:6 },
macroChip: { fontSize:11, color:”#34d399”, background:”#0d2318”, padding:“2px 8px”, borderRadius:99 },
sheetOverlay: { position:“fixed”, inset:0, background:“rgba(0,0,0,0.7)”, zIndex:200, display:“flex”, alignItems:“flex-end”, justifyContent:“center” },
sheet: { background:”#111520”, borderRadius:“20px 20px 0 0”, padding:“12px 16px 32px”, width:“100%”, maxWidth:480, maxHeight:“80vh”, display:“flex”, flexDirection:“column” },
sheetHandle: { width:36, height:4, background:”#2a3548”, borderRadius:99, margin:“0 auto 16px” },
sheetHeader: { display:“flex”, justifyContent:“space-between”, alignItems:“center”, marginBottom:12 },
sheetTitle: { fontWeight:700, fontSize:16 },
closeBtn: { background:“none”, border:“none”, color:”#64748b”, cursor:“pointer”, fontSize:18 },
recipePickRow: { display:“flex”, justifyContent:“space-between”, alignItems:“center”, padding:“12px 0”, borderBottom:“1px solid #1e2535”, cursor:“pointer” },
recipePickName: { fontWeight:600, fontSize:14, marginBottom:4 },
recipePickTags: { display:“flex”, flexWrap:“wrap”, gap:4 },
freeTextBtn: { marginTop:12, background:”#1e2535”, border:“none”, color:”#94a3b8”, borderRadius:8, padding:“10px”, width:“100%”, cursor:“pointer”, fontSize:13 },
tagRow: { display:“flex”, flexWrap:“wrap”, gap:6, marginBottom:12 },
tagChip: { padding:“4px 10px”, borderRadius:99, border:“1px solid #2a3548”, background:“transparent”, color:”#64748b”, fontSize:12, cursor:“pointer”, fontWeight:600 },
tagChipActive: { background:”#1e3a5f”, borderColor:”#3b5280”, color:”#60a5fa” },
miniTag: { fontSize:10, padding:“2px 6px”, borderRadius:99, background:”#1e2535”, color:”#64748b”, marginRight:2 },
recipeCard: { background:”#111520”, border:“1px solid #1e2535”, borderRadius:12, marginBottom:10, overflow:“hidden” },
recipeCardHeader: { display:“flex”, justifyContent:“space-between”, alignItems:“center”, padding:“14px 16px”, cursor:“pointer” },
recipeCardName: { fontWeight:700, fontSize:15, marginBottom:4 },
recipeBody: { borderTop:“1px solid #1e2535”, padding:“12px 16px” },
recipeSection: { fontSize:12, color:”#60a5fa”, textTransform:“uppercase”, letterSpacing:0.5, margin:“0 0 4px” },
recipeText: { fontSize:14, color:”#94a3b8”, lineHeight:1.6, marginBottom:12 },
deleteBtn: { background:”#2d1515”, border:“none”, color:”#fca5a5”, borderRadius:8, padding:“8px 12px”, cursor:“pointer”, fontSize:13, width:“100%” },
formCard: { background:”#111520”, border:“1px solid #1e2535”, borderRadius:12, padding:16, marginBottom:16 },
formRow: { marginBottom:10, display:“flex” },
input: { background:”#0b0e14”, border:“1px solid #1e2535”, borderRadius:8, color:”#e2e8f0”, padding:“10px 12px”, fontSize:15, flex:1, outline:“none”, width:“100%” },
textarea: { resize:“vertical”, minHeight:70, lineHeight:1.5 },
select: { background:”#0b0e14”, border:“1px solid #1e2535”, borderRadius:8, color:”#e2e8f0”, padding:“10px 12px”, fontSize:14, outline:“none”, cursor:“pointer” },
checkLabel: { display:“flex”, alignItems:“center”, fontSize:13, color:”#94a3b8”, cursor:“pointer” },
addBtn: { background:”#1e3a5f”, color:”#60a5fa”, border:“1px solid #3b5280”, borderRadius:8, padding:“10px 16px”, cursor:“pointer”, fontSize:14, fontWeight:700, whiteSpace:“nowrap” },
pantryGrid: { display:“grid”, gridTemplateColumns:“repeat(auto-fill, minmax(130px,1fr))”, gap:10 },
pantryCard: { background:”#111520”, border:“1px solid #1e2535”, borderRadius:12, padding:14, display:“flex”, flexDirection:“column”, alignItems:“center”, gap:6, position:“relative” },
pantryEmpty: { borderColor:”#7f1d1d”, opacity:0.7 },
pantryDelete: { position:“absolute”, top:6, right:6, background:“none”, border:“none”, color:”#334155”, cursor:“pointer”, fontSize:12 },
pantryEmoji: { fontSize:32 },
pantryName: { fontSize:13, fontWeight:700, textAlign:“center” },
qtyRow: { display:“flex”, alignItems:“center”, gap:8 },
qtyBtn: { background:”#1e2535”, border:“1px solid #2a3548”, color:”#60a5fa”, borderRadius:6, width:28, height:28, cursor:“pointer”, fontSize:18, fontWeight:700, display:“flex”, alignItems:“center”, justifyContent:“center” },
qtyNum: { fontSize:15, fontWeight:700, minWidth:24, textAlign:“center” },
qtyUnit: { fontSize:11, color:”#64748b”, fontWeight:400 },
outBadge: { background:”#7f1d1d”, color:”#fca5a5”, fontSize:10, fontWeight:700, padding:“2px 8px”, borderRadius:99 },
lowBadge: { background:”#451a03”, color:”#fbbf24”, fontSize:10, fontWeight:700, padding:“2px 8px”, borderRadius:99 },
reminderRow: { display:“flex”, alignItems:“center”, gap:10, background:”#111520”, border:“1px solid #1e2535”, borderRadius:10, padding:“12px 14px”, marginBottom:8 },
checkBtn: { background:“none”, border:“none”, cursor:“pointer”, fontSize:12, padding:0, color:”#94a3b8” },
reminderText: { fontSize:14, color:”#e2e8f0” },
reminderMeta: { fontSize:12, color:”#64748b”, marginTop:2 },
catBadge: { fontSize:11, fontWeight:700, padding:“2px 8px”, borderRadius:99, color:”#0b0e14”, whiteSpace:“nowrap” },
iconBtn: { background:“none”, border:“none”, color:”#475569”, cursor:“pointer”, fontSize:14 },
sectionTitle: { fontSize:20, fontWeight:800, margin:“0 0 16px”, letterSpacing:”-0.5px” },
rowBetween: { display:“flex”, alignItems:“center”, justifyContent:“space-between”, marginBottom:16 },
groupLabel: { fontSize:13, fontWeight:700, color:”#64748b”, textTransform:“uppercase”, letterSpacing:1, marginBottom:10 },
empty: { color:”#475569”, fontSize:14, fontStyle:“italic”, textAlign:“center”, padding:“20px 0” },
voiceBtn: { background:”#1e2535”, border:“1px solid #2a3548”, borderRadius:6, cursor:“pointer”, fontSize:12, color:”#94a3b8”, display:“flex”, alignItems:“center”, justifyContent:“center”, flexShrink:0 },
voiceBtnActive: { background:”#3d1515”, borderColor:”#7f1d1d” },
};
