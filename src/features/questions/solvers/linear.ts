// Gaussian elimination: a requested linear expression must be invariant over every solution.
export function uniqueLinearValue(equations: number[][], target: number[]): number | null {
  const a=equations.map(row=>[...row]); const n=target.length; const pivots:number[]=[];
  let r=0;
  for(let c=0;c<n && r<a.length;c++) {
    const pivot=a.findIndex((row,i)=>i>=r && Math.abs(row[c])>1e-8);
    if(pivot<0)continue;
    [a[r],a[pivot]]=[a[pivot],a[r]];
    const scale=a[r][c];a[r]=a[r].map(v=>v/scale);
    for(let i=0;i<a.length;i++)if(i!==r){const factor=a[i][c];a[i]=a[i].map((v,j)=>v-factor*a[r][j]);}
    pivots[r]=c;r++;
  }
  if(a.some(row=>row.slice(0,n).every(v=>Math.abs(v)<1e-8)&&Math.abs(row[n])>1e-8))return null;
  const expression=[...target];let value=0;
  for(let i=0;i<pivots.length;i++) {
    const factor=expression[pivots[i]];value+=factor*a[i][n];
    for(let j=0;j<n;j++)expression[j]-=factor*a[i][j];
  }
  return expression.every(v=>Math.abs(v)<1e-8)&&Number.isFinite(value)?value:null;
}
