use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder},
    App, Emitter,
};

const VIEW_ITEMS: [(&str, &str, &str); 3] = [
    ("view-editor-only", "Editor Only", "CmdOrCtrl+1"),
    ("view-editor-list", "Editor + Notes", "CmdOrCtrl+2"),
    ("view-all", "All Panels", "CmdOrCtrl+3"),
];

pub fn setup_menu(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let mut view_menu = SubmenuBuilder::new(app, "View");
    for (id, label, accel) in &VIEW_ITEMS {
        let item = MenuItemBuilder::new(*label)
            .id(*id)
            .accelerator(*accel)
            .build(app)?;
        view_menu = view_menu.item(&item);
    }
    let view_submenu = view_menu.build()?;

    let menu = MenuBuilder::new(app).item(&view_submenu).build()?;

    app.set_menu(menu)?;

    app.on_menu_event(|app_handle, event| {
        let id = event.id().0.as_str();
        if id.starts_with("view-") {
            let _ = app_handle.emit("menu-event", id);
        }
    });

    Ok(())
}
