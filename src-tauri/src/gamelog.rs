use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const KEYWORDS: [&str; 8] = [
  "SendCommodityBuyRequest",
  "SendCommoditySellRequest",
  "CommodityTransactionResponse",
  "SendShopBuyRequest",
  "RmShopFlowResponse",
  "Added notification \"Awarded",
  "AccountLoginCharacterStatus_Character",
  "Projected Start Location is",
];

const DEFAULT_DIRS: [&str; 4] = [
  "C:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE",
  "D:\\Program Files\\Roberts Space Industries\\StarCitizen\\LIVE",
  "D:\\Roberts Space Industries\\StarCitizen\\LIVE",
  "E:\\Roberts Space Industries\\StarCitizen\\LIVE",
];

#[derive(Serialize)]
pub struct LogFile {
  name: String,
  first: Option<String>,
  last: Option<String>,
  lines: Vec<String>,
}

fn timestamp(line: &str) -> Option<String> {
  let rest = line.strip_prefix('<')?;
  let end = rest.find('>')?;
  let ts = &rest[..end];
  if ts.len() >= 20 && ts.starts_with("20") {
    Some(ts.to_string())
  } else {
    None
  }
}

fn read_log(path: &Path) -> Option<LogFile> {
  let bytes = fs::read(path).ok()?;
  let text = String::from_utf8_lossy(&bytes);
  let mut first = None;
  let mut last = None;
  let mut lines = Vec::new();
  for line in text.lines() {
    if let Some(ts) = timestamp(line) {
      if first.is_none() {
        first = Some(ts.clone());
      }
      last = Some(ts);
    }
    if KEYWORDS.iter().any(|k| line.contains(k)) {
      lines.push(line.to_string());
    }
  }
  Some(LogFile {
    name: path.file_name()?.to_string_lossy().into_owned(),
    first,
    last,
    lines,
  })
}

fn is_log(path: &Path) -> bool {
  path.is_file() && path.extension().map(|e| e.eq_ignore_ascii_case("log")).unwrap_or(false)
}

#[tauri::command]
pub fn find_game_dir() -> Option<String> {
  DEFAULT_DIRS
    .iter()
    .find(|d| Path::new(d).join("Game.log").is_file())
    .map(|d| d.to_string())
}

#[tauri::command]
pub fn read_game_logs(dir: String) -> Result<Vec<LogFile>, String> {
  let base = PathBuf::from(&dir);
  let mut paths: Vec<PathBuf> = Vec::new();
  let current = base.join("Game.log");
  if current.is_file() {
    paths.push(current);
  }
  if let Ok(entries) = fs::read_dir(base.join("logbackups")) {
    for entry in entries.flatten() {
      let p = entry.path();
      if is_log(&p) {
        paths.push(p);
      }
    }
  }
  if paths.is_empty() {
    return Err("no_logs".into());
  }
  Ok(paths.iter().filter_map(|p| read_log(p)).collect())
}
