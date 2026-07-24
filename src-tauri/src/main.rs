#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::net::TcpStream;
use std::time::Duration;

/// Holds the Node.js server child process so we can kill it on exit
struct ServerHandle(Mutex<Option<Child>>);

impl Drop for ServerHandle {
    fn drop(&mut self) {
        if let Ok(mut guard) = self.0.lock() {
            if let Some(ref mut child) = *guard {
                eprintln!("[Hogar] Stopping Node.js server...");
                let _ = child.kill();
                let _ = child.wait();
                eprintln!("[Hogar] Server stopped.");
            }
        }
    }
}

/// Wait until the TCP port is accepting connections (server is ready)
fn wait_for_server(port: u16, max_seconds: u64) -> bool {
    for i in 0..max_seconds {
        if TcpStream::connect(format!("127.0.0.1:{}", port)).is_ok() {
            // Give it one more second for Next.js to be fully ready
            std::thread::sleep(Duration::from_secs(1));
            return true;
        }
        if i % 5 == 0 {
            eprintln!("[Hogar] Waiting for server on port {}... ({}s)", port, i);
        }
        std::thread::sleep(Duration::from_secs(1));
    }
    false
}

/// Get the database path. Default: app data dir. Can be overridden via DB_PATH env var.
fn get_db_path() -> String {
    // If DB_PATH is set (e.g., from a previous user choice), use it
    if let Ok(p) = std::env::var("DB_PATH") {
        return format!("file:{}", p);
    }

    // Default: use the app's data directory
    // On Windows this is typically: C:\Users\<User>\AppData\Roaming\com.hogarfinanzas.app
    // On Linux this is typically: ~/.config/com.hogarfinanzas.app
    if let Some(data_dir) = dirs::data_dir() {
        let app_dir = data_dir.join("HogarFinanzas");
        let _ = std::fs::create_dir_all(&app_dir);
        let db_file = app_dir.join("data.db");
        return format!("file:{}", db_file.display());
    }

    // Fallback: current directory
    "file:./data.db".to_string()
}

fn main() {
    let port: u16 = 3456;
    let server_handle = ServerHandle(Mutex::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(server_handle)
        .setup(move |app| {
            eprintln!("[Hogar] Starting Hogar Finanzas...");

            // Determine paths based on dev vs production
            let (node_exe, server_dir) = if cfg!(debug_assertions) {
                // DEV mode: use system node, current directory
                ("node".to_string(), std::env::current_dir().unwrap_or_default())
            } else {
                // PRODUCTION mode: use bundled node and server
                let resource_dir = app.path().resource_dir()
                    .expect("failed to resolve resource dir");

                let node_path = resource_dir.join("node-runtime").join("node.exe");
                let srv_dir = resource_dir.join("server");

                (node_path.to_string_lossy().to_string(), srv_dir)
            };

            let db_url = get_db_path();
            eprintln!("[Hogar] Database: {}", db_url);
            eprintln!("[Hogar] Node: {}", node_exe);
            eprintln!("[Hogar] Server dir: {}", server_dir.display());

            // Start the Node.js server
            let child = Command::new(&node_exe)
                .arg("server.js")
                .env("PORT", port.to_string())
                .env("HOSTNAME", "127.0.0.1")
                .env("NODE_ENV", "production")
                .env("DATABASE_URL", &db_url)
                .current_dir(&server_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .expect(&format!("Failed to start Node.js server. Make sure '{}' exists.", node_exe));

            // Store the process handle
            {
                let handle = app.state::<ServerHandle>();
                *handle.0.lock().unwrap() = Some(child);
            }

            // Wait for the server to be ready
            eprintln!("[Hogar] Waiting for server to start...");
            if !wait_for_server(port, 30) {
                eprintln!("[Hogar] ERROR: Server did not start within 30 seconds.");
                // Don't panic, the user will see the error in the console
                return Ok(());
            }
            eprintln!("[Hogar] Server is ready!");

            // Navigate the main window to the server URL
            let window = app.get_webview_window("main")
                .expect("main window not found");

            let url = format!("http://127.0.0.1:{}", port);
            window.navigate(tauri::Url::parse(&url).unwrap())
                .expect("failed to navigate");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
