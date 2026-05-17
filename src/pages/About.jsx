import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Shield, Blocks, Zap } from 'lucide-react';

const About = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Detection",
      description: "Advanced machine learning algorithms analyze content patterns to detect artificial generation and manipulation.",
      technologies: ["Neural Networks", "Deep Learning", "Pattern Recognition"]
    },
    {
      icon: Shield,
      title: "Blockchain Verification",
      description: "Immutable records stored on blockchain ensure authenticity certificates cannot be tampered with.",
      technologies: ["Ethereum", "Smart Contracts", "Cryptographic Hashing"]
    },
    {
      icon: Blocks,
      title: "Academic Standards",
      description: "Built following rigorous academic research standards with transparent methodologies and reproducible results.",
      technologies: ["Peer Review", "Open Source", "Reproducibility"]
    },
    {
      icon: Zap,
      title: "Real-time Processing",
      description: "Fast processing pipeline delivers results in seconds while maintaining high accuracy and reliability.",
      technologies: ["Optimized Models", "Edge Computing", "Scalable Infrastructure"]
    }
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            About Our Project
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The AI Content Authentication System represents a cutting-edge approach to verifying 
            digital content authenticity in an era of increasingly sophisticated AI-generated media.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <Card className="card-shadow border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-center text-muted-foreground leading-relaxed">
                To provide researchers, educators, and content creators with reliable tools for 
                distinguishing human-created content from AI-generated material, fostering 
                transparency and trust in digital media while advancing the scientific 
                understanding of artificial intelligence detection.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16"
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
              >
                <Card className="card-shadow h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <IconComponent className="text-primary" size={24} />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {feature.technologies.map((tech) => (
                        <Badge key={tech} variant="secondary" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mb-16"
        >
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-2xl text-center mb-4">Technical Architecture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Brain className="text-primary" size={24} />
                    </div>
                    <h3 className="font-semibold mb-2">Frontend Interface</h3>
                    <p className="text-sm text-muted-foreground">
                      React-based user interface with real-time feedback and responsive design
                    </p>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Shield className="text-primary" size={24} />
                    </div>
                    <h3 className="font-semibold mb-2">AI Processing Layer</h3>
                    <p className="text-sm text-muted-foreground">
                      Advanced machine learning models for content analysis and authenticity detection
                    </p>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Blocks className="text-primary" size={24} />
                    </div>
                    <h3 className="font-semibold mb-2">Blockchain Storage</h3>
                    <p className="text-sm text-muted-foreground">
                      Immutable certificate storage on Ethereum blockchain for verification
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <Card className="card-shadow border-accent/20">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Academic Research Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-3 text-accent">Research Objectives</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Develop robust AI detection algorithms</li>
                    <li>• Establish blockchain-based verification protocols</li>
                    <li>• Create reproducible research methodologies</li>
                    <li>• Build open-source academic tools</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 text-accent">Applications</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Academic integrity verification</li>
                    <li>• Media authenticity assessment</li>
                    <li>• Educational content validation</li>
                    <li>• Research publication analysis</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default About;