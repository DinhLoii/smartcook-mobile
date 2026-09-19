import { Recipe, RecipeIngredient, RecipeNutrition, RecipeStep } from "@/types";

export type { Recipe, RecipeIngredient, RecipeNutrition, RecipeStep };

export const RECIPES_DATA: Recipe[] = [
  // 1. Cơm Gà Teriyaki Áp Chảo (Family / Slide 1)
  {
    id: "dish-1",
    title: "Cơm Gà Teriyaki Áp Chảo",
    author: "@smartcook.chef",
    calories: 580,
    minutes: 30,
    stepsCount: 5,
    servings: "4 phần",
    difficulty: "Dễ",
    price: "~65.000đ",
    rating: 4.9,
    reviewCount: 1420,
    category: "family",
    badge: "👨‍👩‍👧 Gia đình • 4 phần",
    sub: "Đậm đà • Cả nhà thích",
    tags: ["Bữa trưa", "Bữa tối", "Món Nhật", "Giàu đạm"],
    fridgeMatchPercent: 100,
    image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
    description:
      "Thịt gà áp chảo giòn da sốt teriyaki bóng bẩy, ăn kèm cơm trắng nóng dẻo và rau củ thanh mát. Đầy đủ dưỡng chất cho cả gia đình.",
    ingredients: [
      { name: "Đùi gà rút xương", amount: "500g", inFridge: true },
      { name: "Nước tương Nhật Kikkoman", amount: "3 muỗng canh", inFridge: true },
      { name: "Mật ong nguyên chất", amount: "2 muỗng canh", inFridge: true },
      { name: "Gừng & tỏi băm", amount: "10g", inFridge: true },
      { name: "Gạo thơm dẻo", amount: "300g", inFridge: true },
      { name: "Hạt mè rang & hành lá", amount: "1 ít", inFridge: false },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Sơ chế gà và thấm khô",
        description:
          "Rửa sạch đùi gà với nước muối loãng, dùng khăn giấy nhà bếp thấm thật khô bề mặt da gà để khi áp chảo da giòn rụm và không bắn dầu.",
        timerMinutes: 5,
      },
      {
        stepNumber: 2,
        title: "Pha nước sốt Teriyaki đặc biệt",
        description:
          "Hòa quyện nước tương, mật ong, gừng băm, 1 chút tiêu và rượu mirin (nếu có). Khuấy tan đều hỗn hợp tạo màu cánh gián đậm đà.",
        timerMinutes: 3,
      },
      {
        stepNumber: 3,
        title: "Áp chảo vàng giòn mặt da",
        description:
          "Đặt mặt da gà xuống chảo không dính ở lửa vừa. Áp chảo khoảng 6-8 phút cho mỡ gà chảy ra tự nhiên và phần da chuyển màu vàng nâu giòn rụm.",
        timerMinutes: 8,
      },
      {
        stepNumber: 4,
        title: "Rim sốt Teriyaki sệt óng ả",
        description:
          "Lật mặt thịt gà, rưới đều bát sốt Teriyaki vào chảo. Hạ lửa nhỏ rim liu riu đến khi nước sốt sánh quyện áo đều miếng thịt gà chín mềm mọng nước.",
        timerMinutes: 6,
      },
      {
        stepNumber: 5,
        title: "Cắt lát và thưởng thức",
        description:
          "Để thịt gà nghỉ 3 phút rồi thái lát vừa ăn. Xếp lên bát cơm nóng, rưới thêm sốt và rắc mè rang thơm lừng cùng hành hoa thái nhỏ.",
        timerMinutes: 3,
      },
    ],
    nutrition: {
      calories: 580,
      protein: "38g",
      carbs: "62g",
      fat: "18g",
      fiber: "3.5g",
      sodium: "820mg",
      advice: "Cân bằng hoàn hảo giữa protein xây dựng cơ bắp và tinh bột phức từ gạo dẻo. Rất phù hợp cho bữa tối gia đình.",
    },
  },

  // 2. Bò Bít Tết Sốt Tiêu Măng Tây (Family / Slide 3)
  {
    id: "dish-2",
    title: "Bò Bít Tết Sốt Tiêu Măng Tây",
    author: "@chef.nguyen",
    calories: 720,
    minutes: 25,
    stepsCount: 5,
    servings: "2 phần",
    difficulty: "Trung bình",
    price: "~85.000đ",
    rating: 4.9,
    reviewCount: 1890,
    category: "family",
    badge: "⭐ 4.9 (1.5k) • 30 phút",
    sub: "Bữa tối giàu protein",
    tags: ["Bữa tối", "Món Âu", "High Protein", "Bữa tiệc"],
    fridgeMatchPercent: 85,
    image: require("@/assets/images/steak-asparagus.jpg"),
    description:
      "Thăn bò mềm ngọt mọng nước áp chảo chín vừa Medium-Rare cùng bơ tỏi thơm nức mũi, kết hợp măng tây giòn ngọt và sốt tiêu đen cay nồng.",
    ingredients: [
      { name: "Thịt thăn bò Tenderloin", amount: "400g", inFridge: true },
      { name: "Măng tây tươi", amount: "150g", inFridge: true },
      { name: "Bơ lạt Anchor", amount: "30g", inFridge: true },
      { name: "Tỏi tép & hương thảo (Rosemary)", amount: "3 tép", inFridge: false },
      { name: "Muối biển & tiêu đen đập dập", amount: "1 muỗng cafe", inFridge: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Thấm khô thịt bò và ướp cơ bản",
        description:
          "Thấm khô miếng thịt bò bằng giấy ăn. Rắc đều muối biển hạt to và tiêu đen xay vỡ lên cả hai mặt thịt 10 phút trước khi áp chảo.",
        timerMinutes: 10,
      },
      {
        stepNumber: 2,
        title: "Làm nóng chảo gang thật nhiệt",
        description:
          "Bật lửa lớn làm nóng chảo gang đến khi bốc khói nhẹ. Cho 1 thìa dầu olive chịu nhiệt cao tráng đều mặt chảo.",
        timerMinutes: 2,
      },
      {
        stepNumber: 3,
        title: "Áp chảo canh độ chín mọng",
        description:
          "Cho thịt bò vào chảo, áp chảo mỗi mặt 2.5 phút không di chuyển để tạo lớp vỏ ngoài nâu sém caramellized giòn thơm.",
        timerMinutes: 5,
      },
      {
        stepNumber: 4,
        title: "Baste bơ tỏi và măng tây",
        description:
          "Hạ lửa vừa, thả bơ lạt, tép tỏi đập dập và nhánh rosemary vào. Dùng thìa múc bơ chảy rưới liên tục lên miếng steak và đảo sơ măng tây bên cạnh.",
        timerMinutes: 3,
      },
      {
        stepNumber: 5,
        title: "Để thịt nghỉ (Resting)",
        description:
          "Gắp thịt ra đĩa ấm để nghỉ 5-7 phút cho nước ngọt ngấm ngược trở lại vào từng thớ thịt. Cắt lát chéo 1.5cm và dùng kèm sốt tiêu.",
        timerMinutes: 5,
      },
    ],
    nutrition: {
      calories: 720,
      protein: "52g",
      carbs: "12g",
      fat: "46g",
      fiber: "4g",
      sodium: "650mg",
      advice: "Cung cấp lượng sắt heme và kẽm dồi dào, hỗ trợ phục hồi thể lực và duy trì năng lượng bền bỉ.",
    },
  },

  // 3. Salad Cá Hồi Áp Chảo (Healthy / Slide 2)
  {
    id: "dish-3",
    title: "Salad Cá Hồi Áp Chảo Chanh Leo",
    author: "@smartcook.ai",
    calories: 420,
    minutes: 20,
    stepsCount: 4,
    servings: "2 phần",
    difficulty: "Dễ",
    price: "~55.000đ",
    rating: 4.8,
    reviewCount: 930,
    category: "healthy",
    badge: "🔥 25 phút • 420 kcal",
    sub: "Giảm cân • Eat Clean",
    tags: ["Eat Clean", "Giảm cân", "Omega 3", "Bữa trưa"],
    fridgeMatchPercent: 90,
    image: require("@/assets/images/salad-salmon.jpg"),
    description:
      "Cá hồi Nauy áp chảo da giòn thịt mềm, kết hợp rau xà lách tươi mơn mởn, quả bơ béo ngậy và sốt chanh leo chua ngọt dịu nhẹ.",
    ingredients: [
      { name: "Phi lê cá hồi Nauy", amount: "250g", inFridge: true },
      { name: "Quả bơ sáp cắt lát", amount: "1 quả", inFridge: true },
      { name: "Xà lách Romaine & rau mầm", amount: "150g", inFridge: true },
      { name: "Cà chua bi & dưa leo", amount: "80g", inFridge: true },
      { name: "Dầu olive Extra Virgin", amount: "2 muỗng canh", inFridge: false },
      { name: "Cốt chanh leo & mật ong", amount: "2 muỗng", inFridge: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Sơ chế cá hồi và rau củ",
        description:
          "Rửa sạch phi lê cá hồi, thấm ráo. Xà lách và cà chua bi ngâm nước muối loãng, vẩy thật ráo nước để salad giữ độ giòn tươi.",
        timerMinutes: 5,
      },
      {
        stepNumber: 2,
        title: "Áp chảo cá hồi da giòn rụm",
        description:
          "Ướp cá với chút muối hồng và tiêu xay. Đặt mặt da cá xuống chảo nóng áp 4 phút cho giòn rụm rồi lật mặt áp tiếp 2 phút.",
        timerMinutes: 6,
      },
      {
        stepNumber: 3,
        title: "Pha sốt chanh leo chua ngọt",
        description:
          "Khuấy đều nước cốt chanh leo lọc bỏ bớt hạt, mật ong, dầu olive, chút muối và tiêu tạo hỗn hợp sốt sánh mịn óng ả.",
        timerMinutes: 3,
      },
      {
        stepNumber: 4,
        title: "Trộn đĩa salad hoàn chỉnh",
        description:
          "Xếp rau xà lách, cà chua bi, bơ sáp cắt hạt lựu ra đĩa. Đặt miếng cá hồi lên trên và rưới nhẹ nước sốt chanh leo.",
        timerMinutes: 2,
      },
    ],
    nutrition: {
      calories: 420,
      protein: "34g",
      carbs: "18g",
      fat: "24g",
      fiber: "7g",
      sodium: "380mg",
      advice: "Giàu Omega-3 và chất béo lành mạnh từ cá hồi và bơ, bảo vệ tim mạch và duy trì làn da tươi trẻ.",
    },
  },

  // 4. Gà Áp Chảo Bơ Mè Low Carb (Healthy)
  {
    id: "dish-4",
    title: "Gà Áp Chảo Bơ Mè Low Carb",
    author: "@chef.fitness",
    calories: 380,
    minutes: 20,
    stepsCount: 4,
    servings: "1-2 phần",
    difficulty: "Dễ",
    price: "~40.000đ",
    rating: 4.7,
    reviewCount: 760,
    category: "healthy",
    badge: "🥗 Low Carb • 380 kcal",
    sub: "Healthy • Tăng cơ",
    tags: ["Low Carb", "Keto", "Tăng cơ", "Ít béo"],
    fridgeMatchPercent: 100,
    image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
    description:
      "Ức gà ướp sốt mè rang áp chảo vàng ruộm, không hề bị khô xác nhờ kỹ thuật áp chảo đậy nắp giữ nước ngọt tự nhiên.",
    ingredients: [
      { name: "Ức gà phi lê", amount: "300g", inFridge: true },
      { name: "Hạt mè trắng rang", amount: "1 muỗng canh", inFridge: true },
      { name: "Dầu mè & xì dầu nhạt", amount: "1 muỗng canh", inFridge: true },
      { name: "Súp lơ xanh hấp", amount: "100g", inFridge: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Khứa nhẹ bề mặt ức gà",
        description: "Khía các đường chéo nông trên ức gà để gia vị ngấm sâu vào trong thớ thịt.",
      },
      {
        stepNumber: 2,
        title: "Ướp sốt mè và dầu hào",
        description: "Trộn đều dầu mè, xì dầu nhạt, tiêu và tỏi băm. Ướp ức gà trong 10 phút.",
      },
      {
        stepNumber: 3,
        title: "Áp chảo đậy nắp giữ ẩm",
        description: "Áp chảo 4 phút mỗi mặt với 1 thìa dầu olive, đậy vung ở 2 phút cuối để ức gà chín mềm ngọt.",
      },
      {
        stepNumber: 4,
        title: "Rắc mè và trang trí",
        description: "Thái miếng dày vừa ăn, rắc mè rang thơm và ăn kèm súp lơ xanh luộc.",
      },
    ],
    nutrition: {
      calories: 380,
      protein: "46g",
      carbs: "8g",
      fat: "14g",
      fiber: "4g",
      sodium: "410mg",
      advice: "Hàm lượng protein cực cao hỗ trợ phát triển cơ bắp cho người tập gym và hạn chế tích tụ mỡ thừa.",
    },
  },

  // 5. Mỳ Ý Bò Bằm Sốt Cà Bolognese (Quick / Slide 4)
  {
    id: "dish-5",
    title: "Mỳ Ý Bò Bằm Sốt Cà Bolognese",
    author: "@smartcook.pasta",
    calories: 540,
    minutes: 15,
    stepsCount: 4,
    servings: "2 phần",
    difficulty: "Dễ",
    price: "~45.000đ",
    rating: 4.9,
    reviewCount: 2100,
    category: "quick",
    badge: "⚡ 15 phút • Chuẩn Ý",
    sub: "Tiện lợi • Nóng hổi",
    tags: ["Mỳ Ý", "Nhanh gọn", "Bữa trưa", "Trẻ em thích"],
    fridgeMatchPercent: 100,
    image: require("@/assets/images/pasta-bolognese.jpg"),
    description:
      "Mỳ Spaghetti chín tới Al Dente quyện sốt bò bằm cà chua chua ngọt đậm đà, phủ phô mai Parmesan bào sợi béo ngậy chuẩn phong vị nước Ý.",
    ingredients: [
      { name: "Mỳ Ý Spaghetti số 5", amount: "180g", inFridge: true },
      { name: "Thịt bò tươi băm nhỏ", amount: "150g", inFridge: true },
      { name: "Cà chua chín xay nhuyễn", amount: "3 quả", inFridge: true },
      { name: "Hành tây & tỏi băm", amount: "1/2 củ", inFridge: true },
      { name: "Phô mai Parmesan bột", amount: "20g", inFridge: false },
      { name: "Lá oregano sấy khô", amount: "1 ít", inFridge: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Luộc mỳ Ý Al Dente",
        description:
          "Đun sôi 2 lít nước với 1 thìa muối. Cho mỳ vào luộc trong 8 phút tới khi chín vừa dẻo dai (Al Dente). Giữ lại 1/2 chén nước luộc mỳ.",
        timerMinutes: 8,
      },
      {
        stepNumber: 2,
        title: "Phi thơm hành tây và xào bò",
        description:
          "Phi thơm tỏi và hành tây thái hạt lựu với dầu ăn. Cho thịt bò bằm vào xào săn trên lửa lớn để bò giữ vị ngọt tự nhiên.",
        timerMinutes: 3,
      },
      {
        stepNumber: 3,
        title: "Nấu sốt cà chua đậm đà",
        description:
          "Đổ cà chua xay và chút nước luộc mỳ vào chảo bò. Nêm nếm muối, đường, tiêu và lá oregano, đun sệt lại trong 4 phút.",
        timerMinutes: 4,
      },
      {
        stepNumber: 4,
        title: "Trộn mỳ và rắc phô mai",
        description:
          "Cho mỳ Ý vào đảo đều với sốt trong 1 phút cho ngấm vị. Cho ra đĩa, rắc phô mai Parmesan bột và thưởng thức ngay khi còn nóng.",
        timerMinutes: 1,
      },
    ],
    nutrition: {
      calories: 540,
      protein: "28g",
      carbs: "68g",
      fat: "16g",
      fiber: "5g",
      sodium: "620mg",
      advice: "Nạp năng lượng carbohydrate dồi dào, giải quyết bữa trưa nhanh gọn chỉ trong 15 phút.",
    },
  },

  // 6. Gà Rán Sốt Mật Ong Cay Giòn (Budget / Slide 5)
  {
    id: "dish-7",
    title: "Gà Rán Sốt Mật Ong Cay Giòn",
    author: "@chef.streetfood",
    calories: 610,
    minutes: 25,
    stepsCount: 5,
    servings: "2-3 phần",
    difficulty: "Dễ",
    price: "~28.000đ",
    rating: 4.8,
    reviewCount: 1650,
    category: "budget",
    badge: "💰 Tiết kiệm • Dưới 30k",
    sub: "Bình dân • No bụng",
    tags: ["Tiết kiệm", "Món chiên", "Mật ong", "Ăn vặt"],
    fridgeMatchPercent: 95,
    image: require("@/assets/images/crispy-chicken.jpg"),
    description:
      "Miếng gà chiên giòn tan rụm vàng ươm, đảo đều cùng lớp sốt mật ong tỏi ớt cay ngọt sánh mịn bắt mắt, cắn vào ngập tràn hương vị bùng nổ.",
    ingredients: [
      { name: "Thịt ức gà hoặc cánh gà", amount: "400g", inFridge: true },
      { name: "Bột chiên giòn pha sẵn", amount: "100g", inFridge: true },
      { name: "Mật ong hoa rừng", amount: "3 muỗng canh", inFridge: true },
      { name: "Tương ớt & ớt băm", amount: "2 muỗng canh", inFridge: true },
      { name: "Tỏi phi giòn & hạt mè", amount: "1 muỗng", inFridge: false },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Cắt miếng và ướp thịt gà",
        description: "Cắt gà thành các miếng vuông vừa ăn 3cm. Ướp với hạt nêm, tiêu và 1 muỗng tỏi băm trong 10 phút.",
      },
      {
        stepNumber: 2,
        title: "Lăn áo bột 2 lần",
        description: "Lăn miếng gà qua lớp bột ướt rồi áo đều một lớp bột khô mỏng để tạo độ xù giòn khi chiên.",
      },
      {
        stepNumber: 3,
        title: "Chiên 2 lần giòn rụm",
        description: "Chiên lần 1 ở lửa vừa 5 phút cho chín thịt. Vớt ra để ráo dầu rồi chiên lần 2 lửa lớn 2 phút tạo độ giòn bền lâu.",
      },
      {
        stepNumber: 4,
        title: "Nấu sốt mật ong tỏi ớt",
        description: "Đun sôi mật ong, tương ớt, xì dầu và tỏi băm trong chảo tới khi nổi bong bóng li ti sệt lại.",
      },
      {
        stepNumber: 5,
        title: "Đảo sốt và rắc mè",
        description: "Đổ gà giòn vào đảo nhanh tay trong 30 giây cho sốt áo đều quanh miếng gà. Rắc mè rang lên trên.",
      },
    ],
    nutrition: {
      calories: 610,
      protein: "35g",
      carbs: "52g",
      fat: "26g",
      fiber: "2g",
      sodium: "720mg",
      advice: "Món ăn kinh tế, giá thành chỉ dưới 30k/suất nhưng mang lại trải nghiệm ẩm thực chuẩn quán.",
    },
  },

  // 7. Cơm Đùi Gà Trứng Ốp La (Budget)
  {
    id: "dish-8",
    title: "Cơm Đùi Gà Trứng Ốp La",
    author: "@bep.sinhvien",
    calories: 520,
    minutes: 15,
    stepsCount: 4,
    servings: "1 phần",
    difficulty: "Dễ",
    price: "~25.000đ",
    rating: 4.7,
    reviewCount: 680,
    category: "budget",
    badge: "🍳 Dễ làm • ~25.000đ",
    sub: "Sinh viên • Tiết kiệm",
    tags: ["Sinh viên", "Cơm tấm", "Tiết kiệm", "Nhanh gọn"],
    fridgeMatchPercent: 100,
    image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
    description: "Cơm đùi gà chiên mắm thơm lừng ăn kèm trứng ốp la lòng đào béo ngậy và dưa chuột giòn mát.",
    ingredients: [
      { name: "Đùi gà góc tư", amount: "1 chiếc", inFridge: true },
      { name: "Trứng gà tươi", amount: "1 quả", inFridge: true },
      { name: "Nước mắm ngon & đường", amount: "1 muỗng", inFridge: true },
      { name: "Cơm trắng", amount: "1 chén", inFridge: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Chiên gà chín vàng",
        description: "Cho đùi gà vào chảo chiên chín vàng đều hai mặt.",
      },
      {
        stepNumber: 2,
        title: "Rim nước mắm tỏi ớt",
        description: "Cho hỗn hợp nước mắm đường tỏi vào đảo đều cho keo lại quanh miếng gà.",
      },
      {
        stepNumber: 3,
        title: "Ốp la trứng lòng đào",
        description: "Ốp nhanh quả trứng gà giữ lòng đào sóng sánh béo ngậy.",
      },
      {
        stepNumber: 4,
        title: "Bày ra đĩa thưởng thức",
        description: "Xới cơm nóng ra đĩa, đặt đùi gà chiên mắm và trứng ốp la lên trên.",
      },
    ],
    nutrition: {
      calories: 520,
      protein: "32g",
      carbs: "58g",
      fat: "17g",
      fiber: "2g",
      advice: "Món ăn quốc dân cho các bạn trẻ và sinh viên, vừa rẻ vừa no lâu.",
    },
  },

  // 8. Cơm Nắm Cá Ngừ Rong Biển (Kids - Trẻ em)
  {
    id: "dish-kids-1",
    title: "Cơm Nắm Cá Ngừ Rong Biển",
    author: "@me.yeucon",
    calories: 360,
    minutes: 15,
    stepsCount: 4,
    servings: "2 phần",
    difficulty: "Dễ",
    price: "~35.000đ",
    rating: 4.9,
    reviewCount: 890,
    category: "kids",
    badge: "👶 Trẻ em • Dễ ăn",
    sub: "Bổ não • Dinh dưỡng",
    tags: ["Trẻ em", "Cơm nắm", "Rong biển", "Canxi"],
    fridgeMatchPercent: 100,
    image: require("@/assets/images/hero-teriyaki-bowl.jpg"),
    description: "Cơm nắm hình tam giác xinh xắn trộn cá ngừ mayonnaise và vụn rong biển giòn tan thơm béo.",
    ingredients: [
      { name: "Cơm dẻo ấm", amount: "2 bát", inFridge: true },
      { name: "Cá ngừ ngâm dầu", amount: "80g", inFridge: true },
      { name: "Xốt Mayonnaise chua dịu", amount: "2 muỗng", inFridge: true },
      { name: "Rong biển vụn ăn liền", amount: "1 gói", inFridge: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Trộn nhân cá ngừ sốt kem",
        description: "Dầm nhuyễn cá ngừ rồi trộn cùng sốt mayonnaise và 1 chút đường dịu.",
      },
      {
        stepNumber: 2,
        title: "Nêm gia vị cho cơm dẻo",
        description: "Trộn cơm ấm với dầu mè và vụn rong biển nướng thơm.",
      },
      {
        stepNumber: 3,
        title: "Tạo hình cơm nắm xinh xắn",
        description: "Cho nhân cá ngừ vào giữa và vo tròn hoặc ép khuôn tam giác ngộ nghĩnh.",
      },
      {
        stepNumber: 4,
        title: "Bọc rong biển và trang trí",
        description: "Dán lá rong biển nhỏ phía dưới để bé dễ cầm ăn không dính tay.",
      },
    ],
    nutrition: {
      calories: 360,
      protein: "22g",
      carbs: "48g",
      fat: "10g",
      fiber: "3g",
      advice: "Cung cấp DHA và iot tự nhiên từ rong biển, kích thích vị giác cho bé lười ăn.",
    },
  },

  // 9. Mỳ Ý Sốt Kem Phô Mai Nấm (Kids - Trẻ em)
  {
    id: "dish-kids-2",
    title: "Mỳ Ý Sốt Kem Phô Mai Nấm",
    author: "@smartcook.kids",
    calories: 480,
    minutes: 20,
    stepsCount: 4,
    servings: "2 phần",
    difficulty: "Dễ",
    price: "~45.000đ",
    rating: 4.8,
    reviewCount: 540,
    category: "kids",
    badge: "🧀 Béo ngậy • Bé mê",
    sub: "Giàu canxi • Dễ tiêu",
    tags: ["Mỳ Ý", "Sốt kem", "Phô mai", "Trẻ em"],
    fridgeMatchPercent: 90,
    image: require("@/assets/images/pasta-bolognese.jpg"),
    description: "Sợi mỳ Ý mềm mại phủ đẫm sốt kem tươi phô mai thơm phức cùng nấm đùi gà ngọt lịm.",
    ingredients: [
      { name: "Mỳ Ý cọng nhỏ", amount: "150g", inFridge: true },
      { name: "Kem tươi Cooking Cream", amount: "100ml", inFridge: true },
      { name: "Phô mai Cheddar hoặc Mozzarella", amount: "40g", inFridge: true },
      { name: "Nấm rơm hoặc nấm mỡ", amount: "80g", inFridge: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Luộc mỳ Ý mềm",
        description: "Luộc mỳ chín mềm hơn bình thường một chút để bé dễ nhai nuốt.",
      },
      {
        stepNumber: 2,
        title: "Xào thơm nấm tươi",
        description: "Xào nấm cắt nhỏ với chút bơ lạt cho thơm mềm.",
      },
      {
        stepNumber: 3,
        title: "Nấu sốt kem phô mai sánh ngậy",
        description: "Đổ kem tươi vào chảo, cho phô mai vào khuấy tan chảy trên lửa nhỏ.",
      },
      {
        stepNumber: 4,
        title: "Trộn mỳ ấm nóng",
        description: "Trút mỳ vào đảo đều 1 phút cho ngấm đẫm sốt kem ngậy thơm.",
      },
    ],
    nutrition: {
      calories: 480,
      protein: "18g",
      carbs: "54g",
      fat: "22g",
      fiber: "3g",
      advice: "Giàu canxi và chất béo tốt giúp bé tăng cân khỏe mạnh.",
    },
  },

  // 10. Nấm Đùi Gà Xào Hạt Điều (Vegetarian - Ăn chay)
  {
    id: "dish-veg-1",
    title: "Nấm Đùi Gà Xào Hạt Điều",
    author: "@chef.chaythanh",
    calories: 320,
    minutes: 15,
    stepsCount: 4,
    servings: "2 phần",
    difficulty: "Dễ",
    price: "~40.000đ",
    rating: 4.9,
    reviewCount: 410,
    category: "vegetarian",
    badge: "🌱 Thuần chay • Thanh lọc",
    sub: "Thơm bùi • Bổ dưỡng",
    tags: ["Ăn chay", "Nấm", "Hạt điều", "Thanh đạm"],
    fridgeMatchPercent: 90,
    image: require("@/assets/images/salad-salmon.jpg"),
    description: "Nấm đùi gà giòn sần sật xào cùng hạt điều bùi béo và ớt chuông ngọt mát trong nước tương đậm vị.",
    ingredients: [
      { name: "Nấm đùi gà tươi", amount: "250g", inFridge: true },
      { name: "Hạt điều rang sẵn", amount: "50g", inFridge: true },
      { name: "Ớt chuông đỏ & xanh", amount: "1 quả", inFridge: true },
      { name: "Dầu hào chay & xì dầu", amount: "2 muỗng", inFridge: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Cắt nấm và ớt chuông",
        description: "Nấm đùi gà cắt khối vuông 2cm, ớt chuông cắt miếng vừa ăn.",
      },
      {
        stepNumber: 2,
        title: "Xào săn nấm đùi gà",
        description: "Phi thơm tỏi hoặc boa-rô, cho nấm vào đảo săn trên lửa lớn.",
      },
      {
        stepNumber: 3,
        title: "Nêm sốt tương chay đậm đà",
        description: "Cho ớt chuông, dầu hào chay, xì dầu và chút tiêu vào đảo chín tới.",
      },
      {
        stepNumber: 4,
        title: "Thêm hạt điều giòn bùi",
        description: "Tắt bếp, trút hạt điều rang vào đảo đều để hạt điều giữ độ giòn tan.",
      },
    ],
    nutrition: {
      calories: 320,
      protein: "14g",
      carbs: "28g",
      fat: "18g",
      fiber: "6g",
      advice: "Món chay thanh nhẹ, giàu khoáng chất kẽm và magie từ hạt điều.",
    },
  },

  // 11. Phở Bò Tái Lăn Hà Nội (Vietnamese - Món Việt)
  {
    id: "dish-vn-1",
    title: "Phở Bò Tái Lăn Hà Nội",
    author: "@amthuc.viet",
    calories: 620,
    minutes: 35,
    stepsCount: 5,
    servings: "2 phần",
    difficulty: "Trung bình",
    price: "~60.000đ",
    rating: 5.0,
    reviewCount: 3200,
    category: "vietnamese",
    badge: "🇻🇳 Món Việt • Tinh hoa",
    sub: "Nước dùng ngọt thanh",
    tags: ["Phở", "Món Việt", "Bữa sáng", "Truyền thống"],
    fridgeMatchPercent: 85,
    image: require("@/assets/images/steak-asparagus.jpg"),
    description: "Thịt bò thăn thái mỏng xào lăn bốc lửa với tỏi gừng, chan nước dùng phở ninh từ xương ống trong veo ngọt thanh thơm nức quế hồi.",
    ingredients: [
      { name: "Bánh phở tươi", amount: "300g", inFridge: true },
      { name: "Thịt thăn bò tươi", amount: "200g", inFridge: true },
      { name: "Nước hầm xương bò", amount: "800ml", inFridge: true },
      { name: "Hành lá & rau mùi tàu", amount: "1 nắm", inFridge: true },
      { name: "Gừng, hoa hồi & thảo quả", amount: "1 ít", inFridge: false },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Nấu nước dùng phở thơm lừng",
        description: "Nướng thơm gừng, hành tím, hoa hồi và thả vào nồi nước hầm xương đun sôi liu riu.",
      },
      {
        stepNumber: 2,
        title: "Xào tái lăn thịt bò bốc lửa",
        description: "Phi tỏi đập dập với mỡ gà/dầu ăn thật nóng, cho thịt bò vào đảo lửa lớn trong 40 giây.",
      },
      {
        stepNumber: 3,
        title: "Chần bánh phở mềm dẻo",
        description: "Chần bánh phở qua nước sôi rồi chia đều vào các tô sứ dày.",
      },
      {
        stepNumber: 4,
        title: "Bày thịt bò và hành hoa",
        description: "Gắp thịt bò tái lăn trải đều lên mặt phở, thêm đầu hành chần và rau mùi thái nhỏ.",
      },
      {
        stepNumber: 5,
        title: "Chan nước dùng sôi sùng sục",
        description: "Chan nước dùng nóng hổi ngập bát phở, ăn kèm ớt tươi và chanh cốm chua thanh.",
      },
    ],
    nutrition: {
      calories: 620,
      protein: "36g",
      carbs: "74g",
      fat: "18g",
      fiber: "3g",
      advice: "Bát phở ấm bụng, giàu năng lượng và bổ huyết cho ngày làm việc năng động.",
    },
  },

  // 12. Panna Cotta Sốt Dâu Tây (Dessert - Tráng miệng)
  {
    id: "dish-des-1",
    title: "Panna Cotta Sốt Dâu Tây",
    author: "@chef.sweet",
    calories: 280,
    minutes: 20,
    stepsCount: 4,
    servings: "3 hũ",
    difficulty: "Dễ",
    price: "~30.000đ",
    rating: 4.9,
    reviewCount: 980,
    category: "dessert",
    badge: "🍓 Tráng miệng • Mát lạnh",
    sub: "Mềm mịn • Tan trong miệng",
    tags: ["Tráng miệng", "Panna Cotta", "Dâu tây", "Mát lạnh"],
    fridgeMatchPercent: 100,
    image: require("@/assets/images/crispy-chicken.jpg"),
    description: "Lớp kem sữa béo ngậy mềm mượt núng nính, kết hợp cùng lớp sốt dâu tây đỏ au chua chua ngọt ngọt xua tan mọi mệt mỏi.",
    ingredients: [
      { name: "Whipping Cream", amount: "150ml", inFridge: true },
      { name: "Sữa tươi không đường", amount: "100ml", inFridge: true },
      { name: "Gelatin lá hoặc bột", amount: "5g", inFridge: true },
      { name: "Dâu tây tươi sên đường", amount: "100g", inFridge: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Ngâm nở gelatin",
        description: "Ngâm gelatin trong nước đá lạnh 10 phút cho nở mềm hoàn toàn.",
      },
      {
        stepNumber: 2,
        title: "Đun ấm kem sữa",
        description: "Đun sữa tươi, whipping cream và đường ở lửa nhỏ đến khi ấm khoảng 60°C.",
      },
      {
        stepNumber: 3,
        title: "Hòa tan gelatin và đổ khuôn",
        description: "Vắt ráo gelatin cho vào hỗn hợp kem ấm khuấy tan, rót vào hũ thủy tinh và để tủ lạnh 4 tiếng.",
      },
      {
        stepNumber: 4,
        title: "Rưới sốt dâu tây tươi",
        description: "Khi panna cotta đông mềm, rưới một lớp sốt dâu tây chua ngọt lên trên và thưởng thức lạnh.",
      },
    ],
    nutrition: {
      calories: 280,
      protein: "5g",
      carbs: "24g",
      fat: "18g",
      fiber: "1.5g",
      advice: "Món tráng miệng hoàn hảo để khép lại bữa ăn gia đình đầm ấm.",
    },
  },
];

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES_DATA.find((r) => r.id === id);
}

export function getRecipesByCategory(category: string): Recipe[] {
  const filtered = RECIPES_DATA.filter((r) => r.category === category);
  return filtered.length > 0 ? filtered : RECIPES_DATA.slice(0, 4);
}
