let momentumBar;
let abSlide, abWallrun, abDash, abBurst;
let speedDisplay;

export function initUI() {
  momentumBar = document.getElementById('momentum-bar');
  abSlide = document.getElementById('ab-slide');
  abWallrun = document.getElementById('ab-wallrun');
  abDash = document.getElementById('ab-dash');
  abBurst = document.getElementById('ab-burst');
  speedDisplay = document.getElementById('speed-display');
}

export function updateUI(player) {
  if (!momentumBar) return;

  const m = player.momentum;
  momentumBar.style.width = (m * 100) + '%';

  // Color the bar based on momentum level
  if (m >= 0.9) {
    momentumBar.style.background = 'linear-gradient(90deg, #6b8f5e, #c4956a, #e8c170, #fff)';
  } else if (m >= 0.7) {
    momentumBar.style.background = 'linear-gradient(90deg, #6b8f5e, #c4956a, #e8c170)';
  } else {
    momentumBar.style.background = 'linear-gradient(90deg, #6b8f5e, #c4956a)';
  }

  // Ability indicators
  abSlide.className = m >= 0.3 ? 'active' : '';
  abWallrun.className = m >= 0.5 ? 'active' : '';
  abDash.className = m >= 0.7 ? 'active' : '';
  abBurst.className = m >= 0.9 ? 'active' : '';

  // Speed display
  const hSpeed = Math.sqrt(
    player.velocity.x * player.velocity.x +
    player.velocity.z * player.velocity.z
  );
  speedDisplay.textContent = hSpeed.toFixed(1) + ' m/s';
}
