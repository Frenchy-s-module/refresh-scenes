function refreshSceneThumbnail(scene) {
  const thumbPath = scene.thumb;
  const needsThumb = !thumbPath || thumbPath.includes('thumb.webp');

  if (needsThumb) {
    return scene
      .createThumbnail({
        img: scene.background?.src || scene.img,
        width: 300,
        height: 200
      })
      .then(async (t) => {
        if (t?.thumb) {
          await scene.update({ thumb: t.thumb }, { render: false });
          return true;
        } else {
          return false;
        }
      })
      .catch((error) => {
        console.error(`Error generating thumbnail for ${scene.name}:`, error);
        return false;
      });
  }
  return Promise.resolve(false);
}

async function askForRefreshAll(scenes) {
  // Vérifier si l'utilisateur est le MJ
  if (!game.user.isGM) return;

  // Créer la boîte de dialogue
  return new Promise((resolve) => {
    new Dialog({
      title: game.i18n.localize('refresh-scenes.dialog.title'),
      content: game.i18n.format('refresh-scenes.dialog.content-multiple', { count: scenes.length }),
      buttons: {
        yes: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('refresh-scenes.dialog.yes'),
          callback: () => resolve(true)
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('refresh-scenes.dialog.no'),
          callback: () => resolve(false)
        }
      },
      default: 'no'
    }).render(true);
  });
}

async function refreshAllScenes() {
  const scenes = game.scenes.contents;
  if (await askForRefreshAll(scenes)) {
    ui.notifications.info(game.i18n.localize('refresh-scenes.notifications.start'));
    for (let scene of scenes) {
      await refreshSceneThumbnail(scene);
    }
    ui.scenes.render(true);
    ui.notifications.info(game.i18n.localize('refresh-scenes.notifications.complete'));
  }
}

let importedScenes = [];
let isImporting = false;
let timeoutId = null;

Hooks.once('init', () => {
  console.log(game.i18n.localize('refresh-scenes.console.init'));
});

// Détecter le début de l'importation
Hooks.on('preCreateScene', (scene) => {
  if (!isImporting) {
    isImporting = true;
    importedScenes = [];
  }
  importedScenes.push(scene);
});

// Détecter la fin de l'importation
Hooks.on('createScene', async (scene) => {
  if (isImporting) {
    // Annuler le timeout précédent s'il existe
    if (timeoutId) clearTimeout(timeoutId);
    
    // Créer un nouveau timeout
    timeoutId = setTimeout(async () => {
      if (importedScenes.length > 0) {
        if (await askForRefreshAll(importedScenes)) {
          ui.notifications.info(game.i18n.localize('refresh-scenes.notifications.start'));
          for (let scene of importedScenes) {
            await refreshSceneThumbnail(scene);
          }
          ui.scenes.render(true);
          ui.notifications.info(game.i18n.localize('refresh-scenes.notifications.complete'));
        }
        importedScenes = [];
        isImporting = false;
        timeoutId = null;
      }
    }, 500);
  }
});

// Ajouter le bouton dans l'en-tête du répertoire des scènes
Hooks.on('renderSceneDirectory', (app, html, data) => {
  if (game.user.isGM) {
    const button = $(`
      <button class="refresh-all-scenes" title="${game.i18n.localize('refresh-scenes.button.refresh-all')}">
        <i class="fas fa-sync"></i> ${game.i18n.localize('refresh-scenes.button.refresh-all')}
      </button>
    `);
    
    button.click(refreshAllScenes);
    
    // Ajouter le bouton après le bouton de création
    html.find('.directory-header .header-actions').append(button);
  }
});
