import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  const scrollToUpload = () => {
    document
      .getElementById("upload-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden py-20">
      <div className="absolute inset-0 subtle-gradient opacity-30" />

      <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-6xl md:text-7xl lg:text-display font-bold mb-8 bg-gradient-to-r from-[#4f46e5] to-[#0ea5e9] bg-clip-text text-transparent leading-tight">
            AI Content Authentication
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground mb-4 leading-relaxed max-w-3xl mx-auto"
          >
            Secure your digital content with AI-powered detection and blockchain
            verification.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-lg md:text-xl text-foreground font-medium mb-12"
          >
            Academic. Transparent. Immutable.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20"
          >
            <Button
              size="lg"
              onClick={scrollToUpload}
              className="hero-gradient text-white hover:scale-[1.02] active:scale-[0.98] transition-fast elegant-shadow px-8 py-6 text-base font-medium"
            >
              Start Authentication
              <ArrowDown className="ml-2" size={20} />
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="hover:scale-[1.02] active:scale-[0.98] transition-fast px-8 py-6 text-base font-medium"
            >
              Learn More
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl mx-auto"
          >
            {[
              {
                title: "AI-Powered",
                description: "Advanced detection algorithms",
              },
              {
                title: "Blockchain",
                description: "Immutable verification records",
              },
              { title: "Academic", description: "Research-grade accuracy" },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-primary mb-3">
                  {feature.title}
                </div>
                <div className="text-base text-muted-foreground">
                  {feature.description}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="cursor-pointer"
          onClick={scrollToUpload}
        >
          <ArrowDown
            className="text-muted-foreground hover:text-primary transition-fast"
            size={24}
          />
        </motion.div>
      </motion.div>
    </section>
  );
};
