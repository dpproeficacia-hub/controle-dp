<div>
              <label className="label">Cidade</label>
              <input className="input" value={form.cidade || ''}
                onChange={e => set('cidade', e.target.value)}
                placeholder="Ex: Divinópolis" />
            </div>

            <div>
              <label className="label">Estado (UF)</label>
              <select className="select" value={form.estado || ''}
                onChange={e => set('estado', e.target.value)}>
                <option value="">Selecionar UF...</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
