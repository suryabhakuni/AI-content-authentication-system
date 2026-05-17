import { motion } from "framer-motion";
import { Github, ExternalLink } from "lucide-react";
import logo from "@/assets/img.png";

export const Footer = () => {
  const techStack = [
    "React.js",
    "JavaScript",
    "Tailwind CSS",
    "shadcn/ui",
    "Framer Motion",
    "Ethers.js",
    "Blockchain",
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8"
        >
          <div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="Logo" className="h-10 w-10 object-contain" />
              <h3 className="text-2xl font-bold">
                AI Content Authentication System
              </h3>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              An academic research project exploring the intersection of
              artificial intelligence, blockchain technology, and content
              authenticity verification.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Built with</h4>
            <div className="flex flex-wrap justify-center gap-2">
              {techStack.map((tech, index) => (
                <motion.span
                  key={tech}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </div>
          <div className="flex justify-center space-x-6">
            <a
              href="https://github.com/suryabhakuni/Ai-content-authentication-system"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Github size={20} />
              <span>Source Code</span>
            </a>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink size={20} />
              <span>Docs</span>
            </a>
          </div>

          <div className="pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              © 2025 AI Content Authentication System | Trust issues? We hash
              them out. Footer’s showing, so yeah… code survived.
            </p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};
