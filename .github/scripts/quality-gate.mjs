import { pathToFileURL } from 'node:url';

export function avaliarDependencias(needs) {
  return ['regressao', 'imagens']
    .filter(nome => needs?.[nome]?.result !== 'success')
    .map(nome => `${nome}: ${needs?.[nome]?.result ?? 'ausente'}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const falhas = avaliarDependencias(JSON.parse(process.env.NEEDS_JSON ?? '{}'));
    if (falhas.length) {
      console.error('Quality Gate reprovado: ' + falhas.join(', '));
      process.exitCode = 1;
    } else console.log('Quality Gate aprovado: regressão e containers concluíram com sucesso.');
  } catch {
    console.error('Quality Gate reprovado: resultados das dependências inválidos.');
    process.exitCode = 1;
  }
}
