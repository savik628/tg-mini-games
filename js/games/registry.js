/**
 * Реестр и фабрика всех 30 мини-игр платформы «Мини игры»
 * Поддерживает динамический запуск, жизненный цикл и обратную совместимость
 */
window.GameRegistry = {
  games: {
    // 1. Скорость и реакция (1-6)
    reaction_tap: () => window.ReactionTapGame,
    color_switch_tap: () => window.ColorSwitchTapGame,
    catch_drop: () => window.CatchDropGame,
    laser_dodge: () => window.LaserDodgeGame,
    tempo_hit: () => window.TempoHitGame,
    fast_clicker: () => window.FastClickerGame,

    // 2. Память и внимание (7-12)
    matrix_grid: () => window.MatrixGridGame,
    stroop_focus: () => window.StroopFocusGame,
    pattern_repeat: () => window.PatternRepeatGame,
    pair_match: () => window.PairMatchGame,
    number_order: () => window.NumberOrderGame,
    shadow_match: () => window.ShadowMatchGame,

    // 3. Логика и головоломки (13-18)
    neon_2048: () => window.Neon2048Game,
    light_connect: () => window.LightConnectGame,
    block_fit: () => window.BlockFitGame,
    pipe_flow: () => window.PipeFlowGame,
    math_rush: () => window.MathRushGame,
    word_scramble: () => window.WordScrambleGame,

    // 4. Аркады и физика (19-24)
    gravity_jump: () => window.GravityJumpGame,
    knife_throw: () => window.KnifeThrowGame,
    bounce_breaker: () => window.BounceBreakerGame,
    stack_tower: () => window.StackTowerGame,
    orbit_defend: () => window.OrbitDefendGame,
    pinball_drop: () => window.PinballDropGame,

    // 5. Точность и Plus-эксклюзивы (25-30)
    perfect_slice: () => window.PerfectSliceGame,
    zen_lines: () => window.ZenLinesGame,
    bubble_burst: () => window.BubbleBurstGame,
    cyber_runner: () => window.CyberRunnerGame,
    cyber_dodge: () => window.CyberDodgeGame,
    gravity_orb: () => window.GravityOrbGame,
  },

  register(appId, gameClass) {
    this.games[appId] = () => gameClass;
  },

  create(appId, container) {
    const getter = this.games[appId];
    if (getter) {
      const GameClass = getter();
      if (GameClass) {
        return new GameClass(container);
      }
    }
    // Fallback заглушка
    container.innerHTML = `
      <div style="padding: 30px; text-align: center; color: #94a3b8;">
        <div style="font-size: 40px; margin-bottom: 12px;">🕹</div>
        <div style="font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px;">Игра в процессе загрузки</div>
        <div style="font-size: 13px;">Модуль ${appId} будет доступен через мгновение.</div>
      </div>
    `;
    return null;
  }
};
