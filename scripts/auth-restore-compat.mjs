// Only the fresh, isolated recovery target uses these column additions.
// Managed Auth evolves independently of the Supabase CLI's bundled local schema.
// Column types come from read-only pg_catalog metadata in the source database;
// the original data and compatibility DDL are encrypted together in the archive.
const safeIdentifier=/^[a-z_][a-z0-9_]*$/;
const safeType=/^(?:uuid|text|boolean|integer|bigint|smallint|real|double precision|bytea|json|jsonb|date|time(?:\([0-6]\))?(?: with(?:out)? time zone)?|timestamp(?:\([0-6]\))?(?: with(?:out)? time zone)?|interval|inet|cidr|name|oid|numeric(?:\(\d{1,3}(?:,\d{1,3})?\))?|character(?: varying)?(?:\(\d{1,5}\))?|(?:auth|extensions)\.[a-z_][a-z0-9_]*)(?:\[\])?$/;
function identifier(name){
 if(typeof name!=='string'||name.length>63||!safeIdentifier.test(name))throw Error('Auth şeması sütun adı doğrulanamadı.');
 return '"'+name+'"';
}
export function buildAuthRestoreCompatibility(sql,columns){
 if(typeof sql!=='string'||!Array.isArray(columns)||columns.length>5000)throw Error('Auth şema metaverisi doğrulanamadı.');
 const definitions=new Map();
 for(const entry of columns){
  const table=identifier(entry?.table),column=identifier(entry?.column),type=entry?.type;
  if(typeof type!=='string'||type.length>100||!safeType.test(type))throw Error('Auth sütun veri türü doğrulanamadı.');
  const key=table+'.'+column;
  if(definitions.has(key))throw Error('Tekrarlanan Auth sütun metaverisi kabul edilmedi.');
  definitions.set(key,type);
 }
 const statements=[],seen=new Set(),tables=new Set();
 const copies=sql.matchAll(/^COPY "auth"\."([a-z_][a-z0-9_]*)" \(([^)\r\n]+)\) FROM stdin;$/gm);
 for(const match of copies){
  const table=identifier(match[1]);tables.add(match[1]);
  const items=match[2].split(', ');
  if(items.length>300)throw Error('Auth COPY sütunları doğrulanamadı.');
  for(const name of items){
   const column=/^"([a-z_][a-z0-9_]*)"$/.exec(name);
   if(!column)throw Error('Auth COPY sütunları doğrulanamadı.');
   const quoted=identifier(column[1]),key=table+'.'+quoted;
   if(seen.has(key))continue;
   const type=definitions.get(key);
   if(!type)throw Error('Kaynak Auth sütun şeması eksik; eksik veriyle geri yükleme reddedildi.');
   statements.push('ALTER TABLE "auth".'+table+' ADD COLUMN IF NOT EXISTS '+quoted+' '+type+';');
   seen.add(key);
  }
 }
 if(!tables.has('users')||!tables.has('identities')||!statements.length)throw Error('Auth kullanıcı/kimlik veri dökümü doğrulanamadı.');
 return '-- Source-typed Auth additions for a fresh isolated recovery target only.\n'+statements.join('\n')+'\n'+sql;
}
