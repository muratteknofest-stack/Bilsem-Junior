// Only the fresh, isolated recovery target uses these column additions.
// Managed Auth evolves independently of the Supabase CLI's bundled local schema.
// Column types come from read-only pg_catalog metadata in the source database;
// the original data and compatibility DDL are encrypted together in the archive.
const safeIdentifier=/^[a-z_][a-z0-9_]*$/;
const compatibilityHeader='-- Source-typed Auth additions for a fresh isolated recovery target only.\n';
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
 return compatibilityHeader+statements.join('\n')+'\n'+sql;
}

/** Split only the exact, source-typed header produced above. The immutable
 * archive is verified first; only the isolated replay separates owner DDL
 * from data import. Unknown statements can never run as the managed owner. */
export function splitAuthRestoreCompatibility(sql){
 if(typeof sql!=='string')throw Error('Auth geri yükleme girdisi doğrulanamadı.');
 if(!sql.startsWith(compatibilityHeader))return {schemaSql:'',dataSql:sql};
 const lines=sql.slice(compatibilityHeader.length).split('\n'),columns=[],statements=[];
 let position=0;
 for(;position<lines.length&&lines[position].startsWith('ALTER TABLE ');position++){
  const match=/^ALTER TABLE "auth"\."([a-z_][a-z0-9_]*)" ADD COLUMN IF NOT EXISTS "([a-z_][a-z0-9_]*)" (.+);$/.exec(lines[position]);
  if(!match)throw Error('Auth uyumluluk DDL biçimi doğrulanamadı.');
  columns.push({table:match[1],column:match[2],type:match[3]});statements.push(lines[position]);
 }
 const dataSql=lines.slice(position).join('\n');
 if(!statements.length||buildAuthRestoreCompatibility(dataSql,columns)!==sql)throw Error('Auth uyumluluk başlığı kaynak COPY sütunlarıyla eşleşmiyor.');
 return {schemaSql:statements.join('\n')+'\n',dataSql};
}
