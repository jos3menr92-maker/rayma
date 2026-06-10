{Object.values(GAMES_REGISTRY).map((game) => {
            // Safer color extraction
            const colorName = game.accentColor.replace('text-', '').replace('-500', '');
            
            return (
              <button
                key={game.id}
                onClick={() => setActiveGame(game.id)}
                className={`w-full group relative p-4 transition-all duration-300 border-l-4 text-left ${
                  activeGame === game.id 
                    ? `bg-slate-900 border-${colorName}-500` 
                    : 'bg-transparent border-slate-800 hover:bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${activeGame === game.id ? game.accentColor : 'text-slate-500'}`}>
                    Terminal {game.id === 'space_invaders' ? '01' : game.id === 'retro_snake' ? '02' : '03'}
                  </span>
                  <span className={`text-lg font-black uppercase tracking-tight ${activeGame === game.id ? 'text-white' : 'text-slate-400'}`}>
                    {game.title}
                  </span>
                </div>
              </button>
            );
          })}
