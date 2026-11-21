use eframe::egui::{
    self, Color32, ColorImage, Pos2, Rect, Sense, TextureHandle, TextureOptions, Vec2,
};
use image::{imageops::FilterType, RgbaImage};
use std::time::Instant;

const WIDTH: u32 = 720;
const HEIGHT: u32 = 288;

struct Star {
    x: f32,
    y: f32,
    phase: f32,
    speed: f32,
    size: f32,
}
struct App {
    lake: RgbaImage,
    sun: RgbaImage,
    moon: RgbaImage,
    stars: Vec<Star>,
    texture: Option<TextureHandle>,
    day: bool,
    light: f32,
    from: f32,
    started: Instant,
    epoch: Instant,
}

fn load(bytes: &[u8], w: u32, h: u32) -> RgbaImage {
    image::load_from_memory(bytes)
        .expect("embedded image")
        .resize_exact(w, h, FilterType::Lanczos3)
        .to_rgba8()
}

impl App {
    fn new() -> Self {
        let mut seed = 0x7253u32;
        let mut random = || {
            seed ^= seed << 13;
            seed ^= seed >> 17;
            seed ^= seed << 5;
            seed as f32 / u32::MAX as f32
        };
        let stars = (0..53)
            .map(|_| Star {
                x: 24.0 + random() * 672.0,
                y: 8.0 + random() * 190.0,
                phase: random() * 6.283,
                speed: 0.6 + random() * 2.0,
                size: 0.7 + random() * 1.2,
            })
            .collect();
        Self {
            lake: load(
                include_bytes!("../../assets/alpine-lake.webp"),
                WIDTH,
                HEIGHT,
            ),
            sun: load(include_bytes!("../../assets/sun-sdo.webp"), 76, 76),
            moon: load(include_bytes!("../../assets/moon-nasa.webp"), 72, 72),
            stars,
            texture: None,
            day: false,
            light: 0.0,
            from: 0.0,
            started: Instant::now(),
            epoch: Instant::now(),
        }
    }

    fn render(&self, time: f32) -> ColorImage {
        let mut out = ColorImage::new([WIDTH as usize, HEIGHT as usize], Color32::TRANSPARENT);
        let light = self.light;
        let sun_x = (105.0 + 46.0 * light) * 2.0;
        let sun_y = (47.0 + 82.0 * (1.0 - light).powf(1.45)) * 2.0;
        let moon_x = (230.0 + 40.0 * light) * 2.0;
        let moon_y = (44.0 + 86.0 * light) * 2.0;
        let skyline = [
            (0., 198.),
            (72., 210.),
            (140., 206.),
            (210., 209.),
            (280., 208.),
            (340., 203.),
            (380., 193.),
            (420., 196.),
            (460., 188.),
            (510., 183.),
            (550., 185.),
            (600., 193.),
            (640., 203.),
            (720., 196.),
        ];
        for y in 0..HEIGHT {
            for x in 0..WIDTH {
                let dx = if x < HEIGHT / 2 {
                    HEIGHT as f32 / 2.0 - x as f32
                } else if x > WIDTH - HEIGHT / 2 {
                    x as f32 - (WIDTH - HEIGHT / 2) as f32
                } else {
                    0.0
                };
                let dy = y as f32 - HEIGHT as f32 / 2.0;
                if dx * dx + dy * dy > (HEIGHT as f32 / 2.0 - 1.0).powi(2) {
                    continue;
                }
                let p = self.lake.get_pixel(x, y).0;
                let tint = [0.19, 0.29, 0.48];
                let mut rgb = [0.0f32; 3];
                for c in 0..3 {
                    rgb[c] = p[c] as f32 * (tint[c] * (1.0 - light) + light);
                }
                let pos = x as f32;
                let edge = skyline
                    .windows(2)
                    .find(|s| pos >= s[0].0 && pos <= s[1].0)
                    .map(|s| s[0].1 + (s[1].1 - s[0].1) * (pos - s[0].0) / (s[1].0 - s[0].0))
                    .unwrap_or(200.0);
                if (y as f32) < edge {
                    for star in &self.stars {
                        let d = ((pos - star.x).powi(2) + (y as f32 - star.y).powi(2)).sqrt();
                        if d < star.size + 1.0 {
                            let pulse = (time * star.speed + star.phase).sin().powi(8);
                            let alpha = (0.2 + 0.8 * pulse)
                                * (1.0 - light)
                                * (star.size + 1.0 - d).min(1.0);
                            for c in 0..3 {
                                rgb[c] += (235.0 - rgb[c]) * alpha;
                            }
                        }
                    }
                    for (cx, cy, image, alpha, radius) in [
                        (sun_x, sun_y, &self.sun, (light * 2.1).min(1.0), 38.0),
                        (
                            moon_x,
                            moon_y,
                            &self.moon,
                            ((1.0 - light) * 1.85).min(1.0),
                            36.0,
                        ),
                    ] {
                        let px = (pos - cx + radius) as i32;
                        let py = (y as f32 - cy + radius) as i32;
                        if px >= 0
                            && py >= 0
                            && px < image.width() as i32
                            && py < image.height() as i32
                        {
                            let body = image.get_pixel(px as u32, py as u32).0;
                            if (pos - cx).powi(2) + (y as f32 - cy).powi(2) < radius * radius {
                                for c in 0..3 {
                                    rgb[c] += (body[c] as f32 - rgb[c]) * alpha;
                                }
                            }
                        }
                    }
                }
                out.pixels[(y * WIDTH + x) as usize] =
                    Color32::from_rgb(rgb[0] as u8, rgb[1] as u8, rgb[2] as u8);
            }
        }
        out
    }
}
impl eframe::App for App {
    fn update(&mut self, ctx: &egui::Context, _: &mut eframe::Frame) {
        let progress = (self.started.elapsed().as_secs_f32() / 1.45).min(1.0);
        let eased = progress * progress * (3.0 - 2.0 * progress);
        self.light = self.from + ((self.day as u8 as f32) - self.from) * eased;
        let image = self.render(self.epoch.elapsed().as_secs_f32());
        if let Some(texture) = &mut self.texture {
            texture.set(image, TextureOptions::LINEAR);
        } else {
            self.texture = Some(ctx.load_texture("landscape", image, TextureOptions::LINEAR));
        }
        egui::CentralPanel::default()
            .frame(egui::Frame::NONE.fill(Color32::from_rgb(12, 14, 19)))
            .show(ctx, |ui| {
                ui.add_space(40.0);
                ui.vertical_centered(|ui| {
                    ui.heading(
                        egui::RichText::new("DAY / NIGHT")
                            .size(32.0)
                            .color(Color32::WHITE),
                    );
                    ui.add_space(32.0);
                    let width = ui.available_width().min(520.0) - 24.0;
                    let (rect, response) =
                        ui.allocate_exact_size(Vec2::new(width, width / 2.5), Sense::click());
                    ui.painter().image(
                        self.texture.as_ref().unwrap().id(),
                        rect,
                        Rect::from_min_max(Pos2::ZERO, Pos2::new(1.0, 1.0)),
                        Color32::WHITE,
                    );
                    ui.painter().rect_stroke(
                        rect,
                        egui::CornerRadius::same((rect.height() / 2.0).min(255.0) as u8),
                        egui::Stroke::new(1.5_f32, Color32::from_rgb(138, 161, 214)),
                        egui::StrokeKind::Inside,
                    );
                    if response.clicked() {
                        self.from = self.light;
                        self.day = !self.day;
                        self.started = Instant::now();
                    }
                    ui.add_space(24.0);
                    ui.label(
                        egui::RichText::new(if self.day {
                            "DAY · click for night"
                        } else {
                            "NIGHT · click for day"
                        })
                        .size(16.0)
                        .color(Color32::from_rgb(185, 195, 218)),
                    );
                });
            });
        ctx.request_repaint_after(std::time::Duration::from_millis(33));
    }
}
fn main() -> eframe::Result {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([680.0, 450.0])
            .with_min_inner_size([360.0, 300.0])
            .with_title("Day Night Toggle"),
        ..Default::default()
    };
    eframe::run_native(
        "Day Night Toggle",
        options,
        Box::new(|_| Ok(Box::new(App::new()))),
    )
}
