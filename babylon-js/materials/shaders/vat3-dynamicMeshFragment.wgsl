varying vColor : vec4<f32>;

if (fragmentInputs.vColor.a < 0.001) { discard; }

fragmentOutputs.color = finalColor * fragmentInputs.vColor;
